# Documentation

A self-hosted dashboard for the decisions your CrowdSec instance has made. It reads your Local API, mirrors it to SQLite so expired bans stay visible, and lets you delete a ban without opening a terminal.

## Start here

Three things have to be true before anything syncs.

| | |
|---|---|
| **LAPI is reachable** | from wherever the dashboard runs, at a URL including the port |
| **You have both credentials** | watcher for the alert evidence, bouncer for the decisions |
| **`LAPI_*` is set** | in a `.env` beside the compose file |

Work through them in this order:

1. **[CrowdSec LAPI setup](lapi-setup.md)** gets the two sets of credentials. Do this first, the rest needs them.
2. **[Configuration](configuration.md)** is the full variable reference once you know what to put in.
3. **[Deployment](deployment.md)** covers the container, updating, and running it somewhere other than Docker.
4. **[SSO / OIDC](sso.md)** is optional, and only worth doing once the basics work.

The [README](../README.md) has the three-command Docker quick start if you just want it running.

## Then

- **[Getting the most out of it](using-the-dashboard.md)** covers what the interface is telling you: what Live means, why a ban says `overdue`, what a simulated decision is.
- **[Integrations](integrations.md)** is what the expanded row can show for your stack, and the one Traefik setting that is easy to miss.
- **[Troubleshooting](troubleshooting.md)** for when you land back on the login page, or the expanded row is empty.

## Working on it

- **[Contributing](CONTRIBUTING.md)** for setup, the docs site and the screenshot script.
- **[Releasing](releasing.md)** for commit conventions and the release workflows.
