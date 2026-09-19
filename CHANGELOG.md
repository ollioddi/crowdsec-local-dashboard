# Changelog

All notable changes to this project are listed here. Each entry is the body of
the corresponding GitHub release: a hand-written summary followed by the list
generated from commits.

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
