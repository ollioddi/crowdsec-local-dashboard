# Contributing a parser

The dashboard parses the metadata attached to CrowdSec alerts to show requests, ports, rules and login attempts. These are TypeScript parsers in this repository; they do not change CrowdSec's log parsers or detection scenarios.

Start with [development setup](CONTRIBUTING.md#setup). You can test a parser with saved alert data without connecting the dashboard to LAPI.

## Choose the change

| What you need | Where to change it |
|---|---|
| A new scenario using an already supported log format | Usually no change. Test a sample alert with the existing integration. |
| Another field from a supported source | Add a field to its event type and read it in its integration. |
| A field shared by several sources, such as a hostname | Add or extend a facet. Facets run on every event, including unknown sources. |
| A source that currently shows **Unknown** | Add an integration, its types, a renderer and tests. |

An **integration** recognises an event and parses source-specific fields. A **facet** reads shared metadata independently of that integration. HTTP fields such as `http_path` can come from several web servers; their presence alone does not identify Traefik.

## Get a sample alert

Run these commands on a machine with access to CrowdSec:

```sh
cscli alerts list
cscli alerts inspect <id> -o json
```

Keep `events[].meta`, event timestamps and the alert's top-level `meta`. The event metadata is a list of string pairs:

```json
{
  "timestamp": "2026-09-22T18:21:33Z",
  "meta": [
    { "key": "log_type", "value": "http_access-log" },
    { "key": "http_verb", "value": "GET" },
    { "key": "http_path", "value": "/login" },
    { "key": "http_status", "value": "403" }
  ]
}
```

Top-level metadata often contains JSON arrays encoded as strings, for example `{ "key": "dst_port", "value": "[\"tcp:443\"]" }`.

Before adding a fixture or posting an issue, replace private hostnames, addresses, usernames and request contents. Keep the metadata keys and value formats intact. State whether your fixture came from a real alert or was constructed from upstream documentation.

## How parsing reaches the screen

The main files are:

| File | Purpose |
|---|---|
| [`types.ts`](../src/common/parsing/types.ts) | Integration IDs, event fields, aggregates and facets |
| [`integrations/integrations.ts`](../src/common/parsing/integrations/integrations.ts) | Registered integrations, in matching order |
| [`registry.ts`](../src/common/parsing/registry.ts) | `parseEvent()` and `parseAlert()` |
| [`meta.ts`](../src/common/parsing/meta.ts) | Metadata readers and tracking of unread keys |
| [`evidence/alert-evidence.tsx`](../src/features/decisions/components/evidence/alert-evidence.tsx) | Renderer registration |
| [`evidence/details.ts`](../src/features/decisions/components/evidence/details.ts) | Collection of **Other fields** and **Not parsed** |

For each event, the first integration whose `matches()` returns true parses it. Every facet then runs on the same metadata. Shared fields such as the timestamp, source IP and datasource are read by the registry.

The alert's primary integration is the most common recognised integration among its events. Ties use registration order; unknown events do not vote. The primary integration reads the alert aggregates and creates `entries`, the short list of paths, ports, usernames or rules. A mixed alert still renders each event with its own integration.

Metadata readers mark keys as read. Unread, nonblank keys appear under **Not parsed**; unknown events show theirs under **Unparsed events**. Parsed values without a dedicated display belong in **Other fields**.

### Metadata readers

| Method | Use |
|---|---|
| `peek(key)` / `has(key)` | Check a value without marking it as read. Use in `matches()`. |
| `str(key, ...aliases)` | First nonblank string; `""` and `"-"` count as absent. Marks all supplied keys as read. |
| `num(key)` | Read an integer. |
| `bool(key)` | Read a boolean string. |
| `list(key, ...aliases)` | Read a JSON array, or wrap a scalar string in an array. |
| `skip(key)` | Mark a discriminator as read after the integration has matched. |

Only skip a key when its meaning is already represented. Reading a key and discarding its value removes it from **Not parsed**.

## Add a field to an existing integration

For example, to display `http_referer` on HTTP events:

1. Add `referer?: string` to `HttpEventFields` in `types.ts`.
2. Add `referer: meta.str("http_referer")` to the object returned by `parseEvent()` in `integrations/traefik-http.ts`.
3. Add a fixture containing that key and assert `parsed.fields.referer` has the expected value. Also test an event without it.

The field now appears in **Other fields**. If it needs a dedicated position, render it in `evidence/http-evidence.tsx` and add `"referer"` to that module's `shownFields` set. Add it to `shownFields` only after rendering it; that set suppresses the fallback display.

## Add a shared event facet

For an illustrative `tls_version` field:

1. Add `tls?: { version: string }` to `EventFacets` in `types.ts`.
2. Create `src/common/parsing/facets/tls.ts`:

   ```ts
   import type { EventFacetDef } from "../types";

   export const tlsFacet = {
     id: "tls",
     extract(meta) {
       const version = meta.str("tls_version");
       return version === undefined ? undefined : { version };
     },
   } satisfies EventFacetDef<"tls">;
   ```

3. Import it and add it to `EVENT_FACETS` in `facets/extract-facets.ts`.
4. Test it on a recognised event, an unknown event and an event without the field. If an existing test expects this key in `unparsed`, update it to assert the parsed facet instead. The current unknown-metadata fixture uses `tls_version`, so this example needs that expectation changed.

New event facets appear in **Other fields**. If you add a dedicated display, update the exclusions in `evidence/details.ts` to avoid duplicates.

For metadata on the whole alert, add the type to `AlertFacets` and read it in `extractAlertFacets()` in `registry.ts` instead. Test its display as well as its parsed value.

## Add an integration

The following example uses a fictional `example-auth` log type. Replace the ID and keys with those from your sample; it is not a specification for a real CrowdSec source.

### 1. Add the types

In `src/common/parsing/types.ts`:

- Add `"example-auth"` to `IntegrationId`.
- Define `ExampleAuthEventFields` below and add it to the `EventFields` union.
- Define `ExampleAuthAggregates` below and add it to the `AlertAggregates` union, even if it only contains `kind`.

```ts
export type ExampleAuthEventFields = {
  kind: "example-auth";
  user?: string;
};

export type ExampleAuthAggregates = {
  kind: "example-auth";
};
```

All three IDs must match: the integration's `id` and both types' `kind`.

### 2. Implement and register it

Create `src/common/parsing/integrations/example-auth.ts`:

```ts
import { distinctValues } from "../meta";
import type {
  ExampleAuthAggregates,
  ExampleAuthEventFields,
  Integration,
} from "../types";

export const exampleAuth = {
  id: "example-auth",
  label: "Example auth",
  matches: (meta) => meta.peek("log_type") === "example-auth",
  parseEvent(meta) {
    meta.skip("log_type");
    return { kind: "example-auth", user: meta.str("target_user") };
  },
  entryType: "usernames",
  extractEntries: ({ events }) =>
    distinctValues(events, (event) => event.str("target_user")),
} satisfies Integration<ExampleAuthEventFields, ExampleAuthAggregates>;
```

Import `exampleAuth` into `integrations/integrations.ts` and add it to `INTEGRATIONS`. Specific matchers belong before broad fallback matchers. Test that unrelated events are not claimed.

`parseAggregates()` is optional. Use it when top-level alert metadata contains source-specific values. Omit `entryType` and `extractEntries()` together if the source has no useful summary list. Existing entry types are `paths`, `ports`, `usernames`, `rules` and `none`. A new entry type requires updating `AlertEntryType` in `prisma/schema.prisma`, regenerating the client and checking the table's entry labels. Adding an integration ID alone needs no database migration.

### 3. Add its display

Create `src/features/decisions/components/evidence/example-auth-evidence.tsx`:

```tsx
import {
  EventList,
  type EvidenceProps,
  type EvidenceRenderer,
  Labeled,
  Line,
} from "./shared";

function ExampleAuthEvidence({ events }: EvidenceProps<"example-auth">) {
  if (events.length === 0) return null;
  return (
    <EventList label={`Login attempts (${events.length})`}>
      {events.map((event) => (
        <Line key={event.id}>
          <Labeled label="User">{event.fields.user ?? "Unknown"}</Labeled>
        </Line>
      ))}
    </EventList>
  );
}

export const exampleAuthEvidence = {
  Component: ExampleAuthEvidence,
  shownFields: new Set(["user"] as const),
} satisfies EvidenceRenderer<"example-auth">;
```

Import it into `evidence/alert-evidence.tsx` and add `"example-auth": exampleAuthEvidence` to `RENDERERS`. The component receives the full alert and only its own events. In a mixed alert, `alert.entries` may belong to another integration: check `alert.entryType` before using it as usernames, ports or rules.

### 4. Test the complete path

Add tests to `src/common/parsing/parsing.test.ts`. It already has a `meta()` helper that converts a record into CrowdSec's key/value list:

```ts
it("parses example-auth and preserves unknown fields", () => {
  const parsed = parseAlert({
    events: [{
      meta: meta({
        log_type: "example-auth",
        target_user: "alice",
        future_field: "keep me",
      }),
    }],
  });

  expect(parsed.integration).toBe("example-auth");
  expect(parsed.entryType).toBe("usernames");
  expect(parsed.entries).toEqual(["alice"]);
  expect(parsed.events[0].fields).toEqual({
    kind: "example-auth",
    user: "alice",
  });
  expect(parsed.events[0].unparsed).toEqual({ future_field: "keep me" });
});
```

Also cover missing fields, blank sentinels, aggregate values and an unrelated event that must not match. Use `parsed.events[n].unparsed` for event metadata and `parsed.unparsed` for alert metadata. Do not make leftovers empty by skipping keys just to satisfy a test.

Run from the repository root:

```sh
pnpm test
pnpm typecheck
pnpm check
pnpm build
```

Check the expanded evidence on desktop and mobile. Add the source to [Integrations](integrations.md), with any logging requirements and the fixture's provenance. The current Traefik, AppSec and OPNsense fixtures come from captured alerts; SSH coverage uses upstream field definitions and still needs a captured alert.

## Existing stored alerts

`src/features/sync/lib/alert-row.ts` stores event arrays as JSON and alert metadata as a JSON key/value record. The detail API reparses them when requested, so a parser improvement can update old evidence without fetching the alert from LAPI again. It cannot recover fields an older dashboard version never stored.

The decisions table uses precomputed `entries`, `entryType` and `integration` columns. Loading expanded evidence does not rewrite those columns. The startup repair only processes rows whose `integration` is null; changes to summary extraction may need a separate backfill. The browser also caches loaded evidence, so reload when checking a parser change.
