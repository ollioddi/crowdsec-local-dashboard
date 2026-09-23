# Contributing a parser

Expand a ban in the dashboard and the box underneath shows what the attacker actually did: the URLs they tried, the ports they scanned, the usernames they guessed. The code that builds that box lives in [`src/common/parsing/`](../src/common/parsing/), and this page is about adding to it.

You want this page if the box says **Unknown** for your setup, or if it shows the ban but leaves out something you can see in `cscli`. What each source shows today is in [Integrations](integrations.md).

## The problem

CrowdSec does not hand over a tidy object. For each log line behind a ban, it hands over a flat list of string pairs, and the keys are whatever the parser for that log source happened to produce.

Here is a real one: a Traefik access log line that tripped a CVE scenario.

```json
{
  "log_type": "http_access-log",
  "http_verb": "GET",
  "http_path": "/index.php?s=index/think/app/invokefunction",
  "http_status": "403",
  "traefik_router_name": "error-pages-router@redis",
  "target_fqdn": "backup.example.com",
  "source_ip": "136.119.64.135",
  "user": "-",
  "ASNNumber": "396982",
  "IsoCode": "US",
  "datasource_path": "/var/log/traefik/access.log"
}
```

Three things about that make it awkward to work with:

- **The keys depend on the source.** Traefik produces `http_path`. OPNsense produces `iface` and `rulenr`. sshd produces `ssh_user`. Almost nothing is shared.
- **Everything is a string**, including numbers and booleans, and `-` means "no value here".
- **It changes.** A CrowdSec upgrade, or a scenario you have never run before, can add keys tomorrow.

So the code has to be specific enough to know that `403` is a status worth colouring red, while never assuming it has seen every key that will ever arrive.

## The two ideas

Look at that list again and the keys fall into two piles.

Some only ever come from one source. `http_path` and `traefik_router_name` are Traefik's; nothing else emits them. Code that understands keys like those is called an **integration**. There is one per log source, and it owns that source from the raw keys all the way to how the box looks.

Some turn up no matter who wrote the line. `ASNNumber` and `IsoCode` are there because CrowdSec looks up the attacker's IP on every event it handles, whatever produced it. `target_fqdn` is the hostname that was attacked, and Traefik, the firewall and the WAF can all report one. Code that understands keys like those is called a **facet**. It is a small slice that runs over every event, no matter which integration claimed it.

| | Integration | Facet |
|---|---|---|
| Answers | *Who wrote this log line?* | *What else does this line happen to carry?* |
| Today | Traefik, OPNsense, AppSec WAF, sshd | GeoIP, CVE id, attacked hostname, client fingerprint |
| You add one when | a whole log source is unsupported | a single value shows up across sources |

When you are unsure which you need: if the value only ever appears in one source, it belongs to that source's integration. If it can appear in several, it is a facet.

Then there is one rule that outranks both: **a key nobody claims is kept, never dropped.** It shows up in the expanded row under *Not parsed*, exactly as CrowdSec sent it. That is what stops an upgrade quietly hiding data from you, and it is why you can usually see a new field in the dashboard before anyone has written code for it.

## What happens when you expand a row

Worth reading once, because the three recipes below are each a step in it.

The dashboard stores CrowdSec's raw lists untouched and works them out again every time you expand a row. So it starts with the list above and, for each log line:

1. It offers the line to each integration in turn, and the **first one that recognises it wins**. Traefik claims the example because `log_type` is `http_access-log`.
2. The winner reads the keys it knows about. That is where `403` becomes a real number and `-` becomes "nothing".
3. Every facet then gets a look at the same line, whoever claimed it. That is where the GeoIP and the attacked hostname come out.
4. Anything still untouched is what *Not parsed* shows.

Once every line is done, the alert picks its integration by majority, so one stray web request cannot make a firewall alert look like a Traefik one. The winner also gets to read CrowdSec's alert-level summary, and to pick out the short list of **things the ban is really about**: the paths for Traefik, the ports for a firewall scan, the usernames for SSH. Those are what the decisions table counts, and what the expanded row shows as chips.

Finally the box is drawn by the component registered for that integration.

Two things follow from all this, and both are useful:

**Reading a key claims it.** That is the mechanism behind *Not parsed*: the code tracks which keys were looked at, and shows you the rest. It also means the check for "is this line mine?" has to peek without claiming, or an unrecognised source would lose the very key you need to see.

**The box is worked out fresh every time.** It is built from the raw lists in your database, not from something decided once when the ban was first synced. So improving a parser fixes the bans already stored: no re-sync, no migration, just a better answer the next time someone expands that row.

## Showing a value the dashboard already receives

The smallest change, and the most common one. You opened *Not parsed*, saw a key you want, and the source is already supported. Say Traefik starts logging `http_referer`.

1. In `src/common/parsing/types.ts`, find the list of fields for that source (`HttpEventFields` for Traefik) and add yours:

   ```ts
   /** Referer header, when the access log keeps it. */
   referer?: string;
   ```

2. In `src/common/parsing/integrations/traefik-http.ts`, read it. `meta.str()` takes a key and gives you back a string or nothing, handling the `-` case for you:

   ```ts
   referer: meta.str("http_referer"),
   ```

You can stop there. The value moves out of *Not parsed* and into *Other fields* on its own, because that section is built from whatever got parsed but is not drawn yet, rather than from a list someone maintains.

Carry on only if it deserves a spot in the main box. That means editing that source's component in `src/features/decisions/components/evidence/` and adding the field to the `shownFields` set exported next to it, which is how *Other fields* knows to stop repeating it.

## Adding a value that appears on several sources

Same idea, but the value is not one source's property. TLS version, say.

1. In `src/common/parsing/types.ts`, describe it and add it to `EventFacets`.
2. Write `src/common/parsing/facets/tls.ts`. Return nothing when the key is absent, and it simply will not appear:

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

3. Add it to the list in `src/common/parsing/facets/extract-facets.ts`.

That is enough to see it, in *Other fields*. Give it a place of its own in the main box only when it earns one.

One exception: a value on CrowdSec's alert-level summary rather than on an individual log line is read by hand in `registry.ts`, so adding one of those means editing `extractAlertFacets` too.

## Supporting a new log source

The big one: the box says **Unknown** and dumps raw keys, because no integration recognises your source. Say you point a CrowdSec agent at Nextcloud.

**Start by copying the closest existing one.** They are 45 to 80 lines and everything an integration does is visible in a single file.

| Copy | If your source |
|---|---|
| `integrations/ssh.ts` | is simple: a couple of values per line |
| `integrations/traefik-http.ts` | says a lot per line, worth showing one row each |
| `integrations/opnsense-pf.ts` | puts the real payload in the alert summary, not the lines |

Then:

1. **Look at your data first.** `cscli alerts inspect <id> -o json` and note the `log_type`, plus which keys actually matter. Keep that output; the test at the end needs it.
2. **Describe the shapes** in `src/common/parsing/types.ts`: a name for the source in `IntegrationId`, the fields one log line gives you, and the fields its alert summary gives you (if none, an empty one is fine). Both carry a `kind` that is the same name as the source, which is how the rest of the code and your editor know which shape they are holding.
3. **Write `src/common/parsing/integrations/nextcloud.ts`:**

   ```ts
   export const nextcloud = {
     id: "nextcloud",
     label: "Nextcloud",
     matches: (meta) => meta.peek("log_type") === "nextcloud",
     parseEvent: (meta) => ({ kind: "nextcloud", user: meta.str("target_user") }),
     // The three below are optional: leave them out when the source has no summary or short list
     parseAggregates: (alertMeta) => ({ kind: "nextcloud", users: alertMeta.list("user") }),
     entryType: "usernames",
     extractEntries: ({ events }) => distinctValues(events, (e) => e.str("target_user")),
   } satisfies Integration<NextcloudEventFields, NextcloudAggregates>;
   ```

   Note `peek` rather than `str` in `matches`: checking whether a line is yours must not claim the key, or unrecognised sources lose it from *Not parsed*.

4. **Add it to the list** in `integrations/integrations.ts`. First match wins, so anything that recognises lines loosely goes last.
5. **Draw the box**: a component in `src/features/decisions/components/evidence/`, exported together with the set of fields it draws as `{ Component, shownFields } satisfies EvidenceRenderer<"nextcloud">`, and added to `RENDERERS` in `alert-evidence.tsx`. TypeScript will tell you it is missing. It receives the whole alert plus only the lines your integration claimed, already typed as your fields, so it never has to filter or narrow. Anything you parse but leave out of `shownFields` shows under *Other fields* by itself.
6. **Write a test**, below.

If the short list of "what the ban is about" needs a kind the database does not have yet (`paths`, `ports`, `usernames`, `rules`), add it to `AlertEntryType` in `prisma/schema.prisma` and write a migration in the same commit.

## Testing it

Every integration has a test built from real `cscli alerts inspect` output with the hostnames changed. Paste yours into `src/common/parsing/parsing.test.ts` next to the others and check the source was recognised, the values came out right, and the short list is what you expect.

```sh
pnpm test
pnpm typecheck
```

Assert on the leftovers too:

```ts
expect(parsed.unparsed).toEqual({});
```

That is how the Traefik test proves it reads every key it claims to understand, and it is what catches a key you meant to read and forgot.

The SSH integration is the exception and has no test, because this homelab has never recorded an SSH alert to copy from. Add one if you have real data.

## What gets stored

Only the raw material and a few precomputed answers. `src/features/sync/lib/alert-row.ts` writes CrowdSec's two lists to the database as JSON exactly as they arrived, which is what lets parsing run fresh on every expand.

Alongside them it stores the short entry list, its kind, and which integration won, so the decisions table can show a count without reading JSON. Everything else (which agent reported it, the bucket that filled, whether it was simulated) is copied straight off the alert and never parsed.
