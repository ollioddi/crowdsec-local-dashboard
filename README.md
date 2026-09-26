# CrowdSec Local Dashboard
> [!IMPORTANT]
> This project is in beta. Expect breaking changes and incomplete features.

A self-hosted local web dashboard for viewing and managing decisions made by your [CrowdSec](https://crowdsec.net) instance. Built for homelab use - no enterprise account or cloud connectivity required.

<!-- screenshots:hero -->
<img src="docs/images/crowdsec-dashboard-desktop-decisions.png" width="600" alt="Decisions - every filter, sort and page lives in the URL"/><br/>
<!-- /screenshots:hero -->

---

## Why?

CrowdSec is great at blocking malicious traffic. The problem is managing false positives from the command line, especially from a phone:

```sh
# The old workflow
ssh myserver
docker exec -it crowdsec bash
cscli decisions list        # find the IP
cscli decisions delete --ip 1.2.3.4
```

This dashboard replaces all of that with a filterable table and a delete button.

---

## Screenshots (Desktop)

<!-- screenshots:desktop -->
<table>
  <tr>
    <td align="center"><img src="docs/images/crowdsec-dashboard-desktop-login.png" width="420" alt="Login with optional OIDC SSO (the button label is configurable)"/><br/><sub>Login with optional OIDC SSO (the button label is configurable)</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-desktop-decisions-filters.png" width="420" alt="Decisions - filter chips with per-column operators and facet counts"/><br/><sub>Decisions - filter chips with per-column operators and facet counts</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/crowdsec-dashboard-desktop-decisions-expanded.png" width="420" alt="Decisions - expanded row showing the HTTP requests behind a ban"/><br/><sub>Decisions - expanded row showing the HTTP requests behind a ban</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-desktop-decisions-appsec.png" width="420" alt="Decisions - expanded row showing the WAF rules that fired"/><br/><sub>Decisions - expanded row showing the WAF rules that fired</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/crowdsec-dashboard-desktop-hosts.png" width="420" alt="Hosts - sortable, filterable IP list with active ban counts"/><br/><sub>Hosts - sortable, filterable IP list with active ban counts</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-desktop-users.png" width="420" alt="Users - local accounts and SSO logins side by side"/><br/><sub>Users - local accounts and SSO logins side by side</sub></td>
  </tr>
</table>
<!-- /screenshots:desktop -->

## Screenshots (Mobile)

<!-- screenshots:mobile -->
<table>
  <tr>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-login.png" width="230" alt="Login with optional OIDC SSO (the button label is configurable)"/><br/><sub>Login with optional OIDC SSO (the button label is configurable)</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-decisions.png" width="230" alt="Decisions - cards instead of a sideways scroll"/><br/><sub>Decisions - cards instead of a sideways scroll</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-decisions-filters.png" width="230" alt="Decisions - any number of filters costs one row on a phone"/><br/><sub>Decisions - any number of filters costs one row on a phone</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-decisions-http.png" width="230" alt="Decisions - the alert sheet, here with the HTTP requests behind a ban"/><br/><sub>Decisions - the alert sheet, here with the HTTP requests behind a ban</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-decisions-ports.png" width="230" alt="Decisions - the alert sheet for a port scan, connections grouped by rule"/><br/><sub>Decisions - the alert sheet for a port scan, connections grouped by rule</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-decisions-ssh.png" width="230" alt="Decisions - the alert sheet for an SSH brute force, one line per attempt"/><br/><sub>Decisions - the alert sheet for an SSH brute force, one line per attempt</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-users-create.png" width="230" alt="Users - the create form opens in a drawer instead of squashing the table"/><br/><sub>Users - the create form opens in a drawer instead of squashing the table</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-hosts-refresh.png" width="230" alt="Hosts - pull the list down to resync with CrowdSec"/><br/><sub>Hosts - pull the list down to resync with CrowdSec</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-hosts.png" width="230" alt="Hosts - sortable, filterable IP list with active ban counts"/><br/><sub>Hosts - sortable, filterable IP list with active ban counts</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-users.png" width="230" alt="Users - local accounts and SSO logins side by side"/><br/><sub>Users - local accounts and SSO logins side by side</sub></td>
    <td align="center"><img src="docs/images/crowdsec-dashboard-mobile-sidebar.png" width="230" alt="Sidebar - slide-out navigation with theme toggle"/><br/><sub>Sidebar - slide-out navigation with theme toggle</sub></td>
  </tr>
</table>
<!-- /screenshots:mobile -->

## Features

- **Host overview** - hosts with decisions recorded by the dashboard, with active ban count and country enrichment
- **Decision management** - filter by IP, type, origin, or status; remove decisions after confirmation
- **Alert evidence** - inspect HTTP requests, WAF rule matches, firewall connections and SSH attempts. Unrecognised metadata is shown alongside the parsed evidence.
- **Real-time updates** - live changes streamed via Server-Sent Events (no polling on the client)
- **Historical tracking** - decisions are mirrored to a local SQLite database; expired bans stay visible
- **User management** - local username/password accounts; the first registered user becomes admin
- **SSO login** - optional OIDC/OAuth integration; works with Authentik, Keycloak, Okta, and any other standards-compliant provider
- **Mobile-friendly** - responsive tables that collapse gracefully on small screens
- **Dark mode** - follows system preference
- **PWA installable** - installs as a Progressive Web App on supported devices.

## What it is built against

I run CrowdSec behind **Traefik** for HTTP, with the **AppSec** component in front of it, and **OPNsense** for the firewall, so those are the stacks this is actually tested on.

Decisions and hosts work with any CrowdSec setup. What is stack-specific is the alert evidence in the expanded row, which is parsed per log type. A stack with no parser still shows the ban, just without the breakdown.

Missing yours? [Open an issue](https://github.com/ollioddi/crowdsec-local-dashboard/issues/new/choose) with a sample alert and I will add it. The parsers are small and self-contained, I just cannot test what I do not run. See [Integrations](docs/integrations.md).

---

## Prerequisites

- A running [CrowdSec](https://crowdsec.net) instance with an accessible Local API (LAPI)
- **Docker + Docker Compose** (recommended) _or_ Node.js 22+ for a manual install

---

## Quick Start (Docker)

### 1. Download the compose file

```sh
curl -o docker-compose.yml https://raw.githubusercontent.com/ollioddi/crowdsec-local-dashboard/main/docker-compose.yml
```

Or clone the full repo if you want to build from source:

```sh
git clone https://github.com/ollioddi/crowdsec-local-dashboard.git
cd crowdsec-local-dashboard
```

### 2. Configure

```sh
curl -o .env https://raw.githubusercontent.com/ollioddi/crowdsec-local-dashboard/main/.env.example
```

Edit `.env` with your values. This step is optional: without a `.env` the dashboard starts with a generated session secret and shows the login page, but does not sync anything until the `LAPI_*` values are set.

See [Configuration](docs/configuration.md) for every variable, and [LAPI setup](docs/lapi-setup.md) for where the CrowdSec credentials come from.

### 3. Run

```sh
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). On first launch you will be prompted to create your admin account.

---

## Documentation

| | |
|---|---|
| [Configuration](docs/configuration.md) | Every environment variable |
| [LAPI setup](docs/lapi-setup.md) | Watcher credentials and the bouncer token |
| [SSO / OIDC](docs/sso.md) | Optional single sign-on |
| [Deployment](docs/deployment.md) | The container, updating, other platforms |
| [Using the dashboard](docs/using-the-dashboard.md) | URL state, what Live means, simulated decisions |
| [Troubleshooting](docs/troubleshooting.md) | Login loops, empty expanded rows, sync banners |
| [Integrations](docs/integrations.md) | Traefik, OPNsense, and adding your stack |

---

## Contributing

Setup, the docs site, the screenshot script and the release process live in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

---

## Tech Stack

| | |
|---|---|
| **Framework** | [TanStack Start](https://tanstack.com/start) - full-stack React with SSR and file-based routing |
| **Database** | SQLite via [Prisma ORM](https://prisma.io) with the `better-sqlite3` driver |
| **Auth** | [Better Auth](https://better-auth.com) - username/password with session management; optional OIDC/OAuth SSO |
| **UI** | [shadcn/ui](https://ui.shadcn.com) components on top of [Tailwind CSS v4](https://tailwindcss.com) |
| **Tables** | [TanStack Table](https://tanstack.com/table) with faceted filters and pagination |
| **Real-time** | Server-Sent Events pushed from the server on every sync |

---

## Future Improvements

- **Create decisions** - the ability to submit simple decisions (e.g. "ban this IP for 1 hour") directly from the UI

- **You tell me!** Create an issue or drop a suggestion if there's something you'd like to see.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is not affiliated with or endorsed by CrowdSec.

The [CrowdSec Console](https://www.crowdsec.net/console/) is CrowdSec’s own management product. This project is an independent dashboard for personal homelabs.

I built it to remove a ban from my phone without SSH-ing into a server. Feature requests are welcome, but I intend to keep that scope small; I am not planning a general CrowdSec management tool.

Supporting CrowdSec through their paid products also funds the development of the open source agent, which benefits everyone. If this dashboard saves you time, and gives you value, consider whether the official console is worth it for your use case.
