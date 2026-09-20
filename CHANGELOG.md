# Changelog

All notable changes to this project are listed here. Each entry is the body of
the corresponding GitHub release: a hand-written summary followed by the list
generated from commits.

## [v0.5.0-beta](https://github.com/ollioddi/crowdsec-local-dashboard/releases/tag/v0.5.0-beta) - 2026-09-20

# v0.5.0-beta

> **This release contains breaking changes.** Read the upgrade notes before updating.

I had originally planned on this release taking a lot longer, but it is weekend after all. Many improvements are borrowed from other project i've worked on recently, and I wanted to get them out sooner rather than later.

This release brings a personally long awaited overhaul to the table implementation, mobile UX and performance.

#### Highlights

##### Table state moved to the URL

<img width="2364" height="1096" alt="Screenshot From 2026-09-20 15-16-43" src="https://github.com/user-attachments/assets/4b2c3304-55fb-4835-9ebc-e13cd0675a75" />

Every bit of table state now lives in the URL. Page, page size, sorting, filters, search, which rows are expanded and which columns are visible. Refresh the page, follow a live update, or send someone a link, and you get the same view back.

This fixes a lot of previous issues where various state would reset on reload or SSE events.

Filtering has furthermore been simplified as a single filter button with operator and values. It utilises full faceting from Tanstack Table to prepopulate values with what's actually present in your data.

Each column decides which operators make sense for it. Text columns get contains, equals, starts with and so on, numbers get comparisons, and dates get before, after and between. Active filters sit next to the search box as chips, and clicking one reopens it for editing.

The decisions table is down to five columns so it fits a laptop screen. Status, origin, country and created date are still fully filterable and sortable, they are just not given a column any more. Clicking through from a host now lands on that host's active decisions, or its expired ones when nothing is active.

##### Revamped mobile UX

Previously on mobile it was a downscaled table. This release brings cards on mobile which are far better utilizing the screen space.

<img width="1248" height="3006" alt="Screen Shot 2026-09-20 at 15 21 16" src="https://github.com/user-attachments/assets/49acd366-93ad-4c2b-b9d4-9b4169dfbd41" />

Each row becomes a card with the IP as its title, the decision type as a badge, the remaining fields labelled underneath, and the same delete and CTI actions. Tapping a card expands it in place with the full alert evidence, exactly like the desktop table.

Since there are no column headers to tap, sorting moved into its own menu that lists every sortable field, including the ones that have no column. Filtering is the same chips and the same Filter button as on the desktop, so a filtered link opens the same view on either. The columns menu is hidden, since cards have no columns to toggle.

Opening the sidebar also behaved badly on a phone. It focused the theme toggle in the footer, which popped that button's tooltip open over the navigation on every single open, and the open tooltip then swallowed the Escape that should have closed the drawer. It now focuses the first navigation entry, and Escape closes it.

##### TanStack Table v9 and the React Compiler

The table moved to TanStack Table v9. Features, row models, filter and sort functions are registered once and the column definitions are typed against that registry, so a column's filter type and its filter function can no longer drift apart.

The more visible win is that every `"use no memo"` directive is gone. The table components were the last part of the app opted out of the React Compiler, because the old API read table state in a way the compiler could not track. Row and header cells now read it through subscription boundaries, so the compiler handles the whole app.

Both layouts also virtualize once a page gets long, measuring real row heights rather than guessing at them. Setting the page size to All stays responsive no matter how many decisions you have, on a phone as well as a desktop.

##### Structured logs

Server logs now go through a proper logging module instead of `console`. Named loggers, six levels behind a `LOG_LEVEL` threshold, and a `LOG_FORMAT` of `human` for a terminal or `json` for a log collector. Warnings and errors go to stderr, and stack traces only appear at debug level.

```
LOG_LEVEL=info      # fatal, error, warn, info, debug or trace
LOG_FORMAT=human    # human for a terminal, json for a log collector
```

Sign-ins, failed sign-ins, users created or deleted, and decisions removed from the dashboard are all logged with who did it. A LAPI that stays down is reported once, again if the error changes, then every tenth poll, with a line when it recovers, instead of repeating the same error every minute.

The server also shuts down properly on SIGTERM now. It stops the poller, closes the live streams and disconnects the database, so the process exits on its own instead of waiting to be killed.

##### Smaller things

- The sidebar shows the version you are running and links to the releases page. It turns into "Update available" when a newer release is tagged, and `UPDATE_CHECK=false` turns that check off
- Relative times ("2 minutes ago", "in 3 hours") update live instead of freezing at whatever they said when the page loaded
- Expanded rows stay inside the width of the table instead of stretching it
- A `/api/health` endpoint that never touches the database, used by the container healthcheck
- An invalid environment variable now stops the container and names the variable, instead of a server that answers 500 to every request

#### ⚠️ Breaking Changes

##### The container runs as a normal user

The image is now built on Alpine, pinned by digest, and runs as the `node` user. npm, corepack, yarn and the TypeScript compiler are gone from the runtime, and the Prisma CLI keeps only what `migrate deploy` needs. The image is down to 630 MB and Trivy finds nothing in it. The compose file mounts the root filesystem read-only and drops every capability.

Because of that, a database created by an earlier release is owned by root and cannot be opened. Fix the volume once before starting the new version:

```sh
docker compose run --rm --user root --cap-add CHOWN --entrypoint chown dashboard -R node:node /data
```

The container prints this command and exits until it is done. Volumes from 0.2.x or earlier have no migration history and must be recreated with `docker compose down -v`.

##### Configuration moved to .env

The compose file no longer holds your environment values. After downloading the new compose file, copy `.env.example` to `.env` next to it and move your settings there, or keep your old compose file with the values inline.

The file is optional now. Without one the container generates a session secret, keeps it in the volume at `/data/auth-secret`, and the dashboard comes up with a login page and syncing off until you set the LAPI values.

#### Updating

```sh
docker compose pull
docker compose up -d
```

Pin the image to this release:

```yaml
image: ghcr.io/ollioddi/crowdsec-local-dashboard:0.5.0-beta
```
### Changes

#### ⚠ Breaking changes

- **docker:** Run as an unprivileged user in a hardened image ([#40](https://github.com/ollioddi/crowdsec-local-dashboard/pull/40), [0e03dce](https://github.com/ollioddi/crowdsec-local-dashboard/commit/0e03dce652d3add7206de52698590ed54b28b08a))
  the container no longer runs as root, so a database
  created by an earlier release is owned by root and cannot be opened. Fix
  the volume once before starting the new version:
  
    docker compose run --rm --user root --cap-add CHOWN --entrypoint chown dashboard -R node:node /data
  
  The container prints this command and exits until it is done. Volumes
  from 0.2.x or earlier have no migration history and must be recreated
  with docker compose down -v.
- **config:** Configure the container through .env and start without one ([#41](https://github.com/ollioddi/crowdsec-local-dashboard/pull/41), [307223b](https://github.com/ollioddi/crowdsec-local-dashboard/commit/307223bf709caf186779753b08b9c06f8fa9839d))
  the compose file no longer contains the environment
  values. After downloading the new compose file, copy .env.example to .env
  next to it and move your settings there, or keep your old compose file
  with the values inline. BETTER_AUTH_SECRET may be left empty; the
  container generates one.

#### Features

- **logging:** Structured server logs with human and json output ([#38](https://github.com/ollioddi/crowdsec-local-dashboard/pull/38), [2636e3c](https://github.com/ollioddi/crowdsec-local-dashboard/commit/2636e3c7025726e611b1f7540ec2590394d7613f))
- **ui:** Show the running version and flag a newer release ([#39](https://github.com/ollioddi/crowdsec-local-dashboard/pull/39), [7362f61](https://github.com/ollioddi/crowdsec-local-dashboard/commit/7362f61e658cb7895056edf93645c7d04f5058ec))
- **ui:** Constrain table expanded rows into width of table, keeping rows scrollable ([#45](https://github.com/ollioddi/crowdsec-local-dashboard/pull/45), [e041739](https://github.com/ollioddi/crowdsec-local-dashboard/commit/e041739cacaa338a786de1f33dec1cd23b753167))
- **table:** Keep table state in the URL and show cards on mobile ([#51](https://github.com/ollioddi/crowdsec-local-dashboard/pull/51), [6b240ff](https://github.com/ollioddi/crowdsec-local-dashboard/commit/6b240ff2a73ac0d62ad3f2f69a13054e9f0393de))

#### Bug fixes

- **ci:** Open release PRs with a maintainer token so CI runs on them ([#35](https://github.com/ollioddi/crowdsec-local-dashboard/pull/35), [eae16d6](https://github.com/ollioddi/crowdsec-local-dashboard/commit/eae16d6e1dc451e7ea443527084aaadf1a3c9e29))
- **ui:** Keep relative times ticking ([#48](https://github.com/ollioddi/crowdsec-local-dashboard/pull/48), [0b876f1](https://github.com/ollioddi/crowdsec-local-dashboard/commit/0b876f18b49cc71e9ca8f0b01e30b7451bf2c5de))
- **ui:** Focus the first menu entry when the mobile sidebar opens ([#49](https://github.com/ollioddi/crowdsec-local-dashboard/pull/49), [4972388](https://github.com/ollioddi/crowdsec-local-dashboard/commit/49723888433087823d540a19a641f0691d2f9bb6))

#### Documentation

- Minor readme adjustments ([37dd907](https://github.com/ollioddi/crowdsec-local-dashboard/commit/37dd907496d0cde7b2af0ec1f4dc5542a3b5d502))

**Full diff:** [v0.4.1-beta...HEAD](https://github.com/ollioddi/crowdsec-local-dashboard/compare/v0.4.1-beta...HEAD)

## [v0.4.1-beta](https://github.com/ollioddi/crowdsec-local-dashboard/releases/tag/v0.4.1-beta) - 2026-09-19

# v0.4.1-beta

A small follow-up to v0.4.0-beta. No breaking changes, but one correction you should read.

### Highlights

#### Image tag correction

The v0.4.0-beta notes told you to pin `image: ghcr.io/ollioddi/crowdsec-local-dashboard:v0.4.0-beta`. That tag does not exist. Image tags on GHCR have no `v` prefix, so the right value was `0.4.0-beta`, and for this release it is:

```yaml
image: ghcr.io/ollioddi/crowdsec-local-dashboard:0.4.1-beta
```

The compose file in the repo now pins the release it belongs to, so downloading it again gets you the matching image. Updating is now: download the compose file, `docker compose pull`, `docker compose up -d`. The README says the same.

#### Smaller things

- The image on GHCR shows a description again
- Release housekeeping: the changelog is added through a pull request, `latest` builds no longer queue up behind each other, and each release pins the compose file automatically

### Changes

#### Features

- **ci:** Pin the compose file to the release from the draft workflow ([549270e](https://github.com/ollioddi/crowdsec-local-dashboard/commit/549270e68861f7768ee8a494f65cf263534e6f73))

#### Bug fixes

- **ci:** Update the changelog through a pull request ([5ffba44](https://github.com/ollioddi/crowdsec-local-dashboard/commit/5ffba442442811baf6b504e888a7ab1f3993e3f1))

#### Documentation

- Pin compose to 0.4.0-beta and describe updating with a pinned tag ([1d39c6f](https://github.com/ollioddi/crowdsec-local-dashboard/commit/1d39c6fa77b589f8ae3ba462dca480c059284cdd))

**Full diff:** [v0.4.0-beta...v0.4.1-beta](https://github.com/ollioddi/crowdsec-local-dashboard/compare/v0.4.0-beta...v0.4.1-beta)

## [v0.4.0-beta](https://github.com/ollioddi/crowdsec-local-dashboard/releases/tag/v0.4.0-beta) - 2026-09-19

# v0.4.0-beta

> **This release contains breaking changes.** Please read the upgrade notes before updating.

This update is a long time coming, and I apologize for not having been very active. This release is mostly maintenance and bug fixes: dependencies are up to date, several security issues are closed, and a lot of the jank around the decision table and the delete flow is gone.

I finished my bachelors degree in CS this summer, and started working full-time, so it has been busy. I'm going to put in more effort maintaining this project going forwards.

### Highlights

#### Security

Server functions could be called without being logged in. Only page loads were protected, so anyone who could reach the dashboard could create users or delete decisions from LAPI. Every function that reads or changes data now requires a session. If your dashboard is reachable from the internet, update.

Note that TanStack Start uses RPC's internally with endpoints generated from the function hash. While possible to exploit, it would be unlikely. 

#### Sync that recovers on its own

A failed sync used to lose the decisions in that pull until the next restart, and a hung connection to LAPI could stop syncing entirely. Every LAPI request now has a timeout, a failed sync forces a full pull on the next poll, and decisions past their expiry are deactivated even if LAPI never reported them. When LAPI cannot be reached, a banner at the top of the dashboard says so, with the error and the time of the last successful sync.

#### Deleting decisions

Deleting a decision now updates the row in place and pushes the change to every open tab and to the Hosts page immediately. Decisions that expire between polls move to the expired section instead of disappearing until the next reload. Deleting a decision that already expired no longer fails.

#### Smaller things

- The live connection sends heartbeats, so reverse proxies stop dropping it and the Live indicator stops flapping
- Host "last seen" is no longer reset for every host on each restart
- Navigating between pages no longer re-downloads the full decision list
- The service worker was removed. It never ran, and would have served stale data if it had. The app is still installable from the browser
- Decision history is now pruned by default, see below

### ⚠️ Breaking Changes

#### 1. OIDC redirect URI has changed

The auth library moved its callback route. If you use SSO, update the redirect URI in your provider (Authentik, Keycloak, Okta, ...) from

```
https://your-dashboard/api/auth/oauth2/callback/oidc
```

to

```
https://your-dashboard/api/auth/callback/oidc
```

Until you do, the provider rejects the login with a redirect URI error.

#### 2. Reverse proxy headers

The dashboard now takes its public URL from the `X-Forwarded-Host` and `X-Forwarded-Proto` headers sent by your reverse proxy. Traefik, Caddy and nginx set these by default. If yours does not, or you see `Invalid origin` when logging in, set the public URL explicitly:

```yaml
BETTER_AUTH_URL: https://your-dashboard.example.com
```

#### 3. Decision history is pruned by default

The decision table used to grow without limit. It is now capped at 5000 rows. The oldest inactive decisions are removed first, together with hosts and alerts that nothing references anymore. Active decisions are never pruned. To keep everything, set:

```yaml
DECISION_RETENTION_COUNT: "0"
```

The database migrates automatically this time. No volume reset is needed.

---

### Reminders from v0.3.0-beta

The image is published as **ghcr.io/ollioddi/crowdsec-local-dashboard**. The old `crowdsec-dashboard` name stopped receiving builds in February, and the compose file in this repo pointed at it until this release. If you still pull the old name, you are running a stale image.

> [!CAUTION]
> Pin a tagged version instead of `latest` while the project is in beta. `latest` is rebuilt on every merge to main and can change under you between releases.

```yaml
image: ghcr.io/ollioddi/crowdsec-local-dashboard:0.4.0-beta
```

---

### What's next

In the coming weeks I'm going to overhaul the entire table implementation. Right now a live update forces the table to reset, which closes expanded rows and jumps the page. I intend to keep all table state in the URL and have it survive updates. No more expanded rows snapping shut when an event arrives.

I'll also move to TanStack Table v9, mostly because v8 plays badly with the React Compiler, and put some effort into mobile. Thin scrollable rows are not great on a phone, and that view deserves its own layout.

Stay tuned!

### Changes

#### Features

- **sync:** Prune decision history by default ([2f1b1be](https://github.com/ollioddi/crowdsec-local-dashboard/commit/2f1b1bec0abfe5e2965aa181defd4eb33656191d))
- **ci:** Draft releases with generated notes and keep the changelog in sync ([e2834aa](https://github.com/ollioddi/crowdsec-local-dashboard/commit/e2834aaa6d2a96eb1e1f13c2fec6b109a8435d8b))
- **ui:** Show a banner when the CrowdSec sync fails or is not configured ([89285de](https://github.com/ollioddi/crowdsec-local-dashboard/commit/89285de66d04c3ded15ee69474a94b985481eca9))

#### Bug fixes

- **auth:** Migrate generic OAuth to better-auth 1.7 social sign-in ([8a19409](https://github.com/ollioddi/crowdsec-local-dashboard/commit/8a19409b91fb7f67d3c55833ede7af12a96f3843))
- **auth:** Add user.image column required by better-auth 1.7 ([9a3b23e](https://github.com/ollioddi/crowdsec-local-dashboard/commit/9a3b23ee334579145c9698433593890b47aba360))
- **auth:** Require a session on every data server function ([9118741](https://github.com/ollioddi/crowdsec-local-dashboard/commit/9118741a7cbedeb7bfb1fff7aa9cb2f43cd0f0f6))
- **lapi:** Add request timeouts, share watcher logins, tolerate deleting a gone decision ([4288049](https://github.com/ollioddi/crowdsec-local-dashboard/commit/4288049bde89dc999f53216d288816427a4c1d38))
- **sync:** Recover from failed pulls, keep host timestamps stable, batch count updates ([282e791](https://github.com/ollioddi/crowdsec-local-dashboard/commit/282e791467a96dcc15527c379649be8d0d025658))
- **dev:** Keep a single LAPI poller across SSR module reloads ([2fe0bad](https://github.com/ollioddi/crowdsec-local-dashboard/commit/2fe0badfc1689669e641cf9fa296c4ad6c27228f))
- **decisions:** Broadcast after delete and record the actual expiry ([be44043](https://github.com/ollioddi/crowdsec-local-dashboard/commit/be44043ef297b201d2d4e7d90fce37a36ab1151b))
- **decisions:** Update the deleted row in place and keep expired rows ([dc0f0cf](https://github.com/ollioddi/crowdsec-local-dashboard/commit/dc0f0cf34111d29db5ae8e26b869e0ae96668844))
- **sse:** Send heartbeats, share the route handler, answer 401 when logged out ([02aa520](https://github.com/ollioddi/crowdsec-local-dashboard/commit/02aa520c96030c4f75d3acce31ed080460d24537))
- **client:** Stop redundant refetches and reconnects ([425c8ab](https://github.com/ollioddi/crowdsec-local-dashboard/commit/425c8ab8d5fc0ecfa0d09efada632cfc515b05e5))
- **build:** Remove the service worker plugin ([9a81e91](https://github.com/ollioddi/crowdsec-local-dashboard/commit/9a81e9163079e6144b39dccc9dfa730662c86f7f))
- **docker:** Point the compose file at the renamed image ([2cbdbe4](https://github.com/ollioddi/crowdsec-local-dashboard/commit/2cbdbe4baf5007bc21254be9a5b4ac37490ccf87))
- **auth:** Trust reverse proxy headers when inferring the base URL ([3a31ded](https://github.com/ollioddi/crowdsec-local-dashboard/commit/3a31ded71f46924e5180ed53860e8ffb605e7b9e))

#### Documentation

- Describe the release process ([d2f9940](https://github.com/ollioddi/crowdsec-local-dashboard/commit/d2f9940e893b5687784404041a3f880a0a368414))

#### Dependencies

- **deps:** Bump all dependencies to latest majors ([a277a9f](https://github.com/ollioddi/crowdsec-local-dashboard/commit/a277a9f244b51a7575ae503c2d33b85d47348699))
- **deps-dev:** Bump oxc-transform-react in the minor-and-patch group ([03cea1b](https://github.com/ollioddi/crowdsec-local-dashboard/commit/03cea1bef41637d07b28ce522e6443a0cb873d21))
- **deps:** Bump the actions group with 8 updates ([55a3da4](https://github.com/ollioddi/crowdsec-local-dashboard/commit/55a3da47e6308c73ec74fc654bca62d1d397e504))

**Full diff:** [v0.3.0-beta...v0.4.0-beta](https://github.com/ollioddi/crowdsec-local-dashboard/compare/v0.3.0-beta...v0.4.0-beta)
