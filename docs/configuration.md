# Configuration

Every setting is an environment variable. The shipped [`.env.example`](../.env.example) is the practical starting point; this page is the full reference.

> [!WARNING]
> Never put a `#` comment on the same line as a value. Docker Compose keeps it as part of the value, and an empty key with a trailing comment becomes the comment.

## Core

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | | `file:/data/app.db` | SQLite path. Defaults to the persistent volume, so there is no need to change it. |
| `BETTER_AUTH_SECRET` | | _(generated)_ | Secret used to sign sessions. The container generates one on first start and keeps it in the volume at `/data/auth-secret`. Set it to choose your own, and always set it for `pnpm dev`. Generate with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | | _(inferred from the proxy headers)_ | The public URL of the dashboard, e.g. `https://dashboard.example.com`. Leave it unset for plain HTTP at `http://<host>:3000`. Set it when you serve over HTTPS, so the session cookie is marked `Secure`. The flag is picked at startup, so without this it stays unmarked even behind an HTTPS proxy, and the dashboard warns when it notices. Also set it if logins fail with "Invalid origin". |

## CrowdSec LAPI

See [LAPI setup](lapi-setup.md) for where these values come from.

| Variable | Required | Default | Description |
|---|---|---|---|
| `LAPI_URL` | Yes | | LAPI base URL including port, e.g. `http://192.168.1.100:8080`. |
| `LAPI_MACHINE_ID` | Yes | | Machine ID for watcher authentication. |
| `LAPI_MACHINE_PASSWORD` | Yes | | Machine password for watcher authentication. |
| `LAPI_BOUNCER_API_TOKEN` | Yes | | API token for bouncer (read) access. |
| `LAPI_POLL_INTERVAL` | | `60` | Seconds between LAPI decision syncs. |

Without the machine credentials there is no alert evidence and no ASN data, so the expanded row stays empty.

## Retention

Both limits apply on every sync. Days are applied first, then the count.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DECISION_RETENTION_COUNT` | | `20000` | Maximum decisions kept in the database. The oldest inactive ones are pruned first, together with hosts and alerts nothing references anymore. Set to `0` to keep everything. |
| `DECISION_RETENTION_DAYS` | | `0` | Also drop inactive decisions older than this many days. `0` disables the age limit. |

## Logging

| Variable | Required | Default | Description |
|---|---|---|---|
| `LOG_LEVEL` | | `info` | Lowest level written: `fatal`, `error`, `warn`, `info`, `debug` or `trace`. |
| `LOG_FORMAT` | | `human` | `human` is one colored line per event. `json` writes one JSON object per line for a log collector. |

At `info` the log records what changed: sign-ins and failed sign-ins, users created or deleted, decisions removed from the dashboard and by whom, every sync that changed something, and LAPI outages with their recovery. Stack traces appear only at `debug`, where quiet polls are logged too.

Set `NO_COLOR=1` to drop the colors from `human` output.

## Updates

| Variable | Required | Default | Description |
|---|---|---|---|
| `UPDATE_CHECK` | | `true` | Ask GitHub for the newest release a few times a day so the sidebar can point out an update. Set to `false` to never contact GitHub. |

## SSO

Optional. See [SSO setup](sso.md) for the provider side.

| Variable | Required | Default | Description |
|---|---|---|---|
| `OIDC_CLIENT_ID` | | | Client ID from your OIDC provider. Required to enable SSO. |
| `OIDC_CLIENT_SECRET` | | | Client secret from your OIDC provider. Required to enable SSO. |
| `OIDC_ISSUER_URL` | | | Issuer URL, e.g. `https://authentik.example.com/application/o/my-app/`. Required to enable SSO. |
| `OIDC_BUTTON_LABEL` | | `Sign in with SSO` | Label shown on the SSO login button. |
| `OIDC_AUTO_REDIRECT` | | `false` | Set to `true` to skip the login form and redirect straight to your SSO provider. |
