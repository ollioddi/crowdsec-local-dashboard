# Troubleshooting

## I log in and land back on the login page

The session cookie is being dropped. The `Secure` flag is decided once at startup, and the container runs with `NODE_ENV=production`, so without `BETTER_AUTH_URL` the cookie went out as `__Secure-` and the browser discarded it on a plain HTTP origin. The login itself succeeded, which is why the logs look fine.

Browsers accept `Secure` cookies on `http://localhost`, so this only bites once you reach the dashboard at a LAN address.

| How you reach it | Needs |
|---|---|
| `http://192.168.0.196:3000` | leave `BETTER_AUTH_URL` unset |
| `http://localhost:3000` | nothing |
| `https://dashboard.example.com` | `BETTER_AUTH_URL=https://dashboard.example.com` |

The dashboard logs a one-time warning when it notices the mismatch.

## Login fails with "Invalid origin"

`BETTER_AUTH_URL` does not match the URL you are actually using. Set it to the public URL, scheme included, with no trailing slash.

This shows up behind a reverse proxy, and only on requests that carry cookies, which is why a first visit can look fine.

## SSO worked before 0.4 and now fails

The redirect URI changed. Register `/api/auth/callback/oidc` with your provider; the old `/api/auth/oauth2/callback` route no longer exists.

## The expanded row is empty

The decision synced but the alert evidence did not.

- No `LAPI_MACHINE_ID` and `LAPI_MACHINE_PASSWORD`. The bouncer token reads decisions but not alerts, so there is nothing to expand, and hosts get no ASN or country either. The sync banner names this case.
- The decision came from a blocklist or from `cscli`. Those never have alerts, and the row says so.
- CrowdSec only keeps the triggering log lines for a limited window, so an old decision may genuinely have none left.
- The decision came from CAPI or a community blocklist. Those are only mirrored when [`LAPI_DECISION_ORIGINS`](configuration.md#crowdsec-lapi) includes them, and they carry no evidence either way.

If the row expands but the box says **Unknown** and lists raw meta, the alert arrived fine and the log type has no parser yet. See [Integrations](integrations.md#a-source-with-no-parser).

## The expanded row lists fewer alerts than `cscli` does

`LAPI_ALERT_LIMIT` caps how many alerts are requested per host, at 100 by default. Raise it for a host that keeps tripping scenarios.

## A banner says the sync failed

The server cannot reach LAPI. Check that `LAPI_URL` includes the port and that the dashboard's network can reach it. A LAPI bound to localhost on the CrowdSec host is not reachable from a container elsewhere.

## The Live dot keeps flapping

Something between the browser and the server is closing the event stream. The server sends a keepalive comment every 20 seconds for exactly this reason, so a proxy dropping it usually means an idle timeout shorter than that, or response buffering that holds the stream back. Turn buffering off for the dashboard and raise the read timeout.

## Every request 500s with "Invalid environment variables"

A value in `.env` did not parse, and the container names the variable. The most common cause is an inline comment:

```env
LAPI_URL=   # include the port
```

Compose only strips an inline `#` comment when the key already has a value, so here the comment becomes the value. Put comments on their own line.

## The container will not start after an upgrade

Coming from 0.4.x or earlier, the database in the volume is owned by root. The container prints the fix, which otherwise looks like a restart loop. See [Deployment](deployment.md#upgrading-from-04x-or-earlier).

## Nothing syncs after updating the compose file

From 0.5 the compose file carries no settings. They come from a `.env` beside it, so if you downloaded a new compose file without creating one, the `LAPI_*` values are gone. Keeping your old compose file with inline values also works.
