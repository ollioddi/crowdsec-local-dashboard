# Integrations

Decisions and hosts work with any CrowdSec setup. What is stack-specific is the **alert evidence** in the expanded row: the paths that were hit, the ports that were scanned, the usernames that were tried. That is parsed per log type, so a stack with no parser still shows the ban, just without the breakdown.

| Log type | Source | Evidence shown |
|---|---|---|
| `http_access-log` | Traefik | Request paths, verb, status, user agent, router |
| `appsec-block`, in-band rule events | CrowdSec AppSec (WAF) | Rule that fired, whether the request was blocked, matched zone, payload |
| `pf_drop`, `pf_pass` | OPNsense | Destination ports, interface, rule number |
| `ssh_auth`, `auth` | CrowdSec `sshd` collection | Targeted usernames |

I run Traefik, the AppSec component and OPNsense, so those are the ones this is actually tested on. The `sshd` parser is written from the collection's documented fields, not from live data.

Whatever the source, the box also shows what the alert carries regardless of log type: the scenario version, bucket and alert id on the header, and CVE and technology tags from the scenario plus the JA4H client fingerprint under it. GeoIP, the reporting agent and the log it read sit in the facts column beside the box. Two sections at the bottom catch the rest: **Other fields** lists every value a parser read but the box does not draw, and **Not parsed** lists every key no parser reads at all, so a new CrowdSec field is visible the day it appears.

## Traefik

Traefik does not log request headers by default, so there is no user agent in the line and that label never appears on a request. A minimal `accessLog` block is enough for everything else:

```yaml
accessLog:
  filePath: "/var/log/traefik/access.log"
  bufferingSize: 50
```

Paths, methods and status codes all come through with that, and the `crowdsecurity/traefik-logs` parser reads both JSON and CLF.

To get the user agent as well, add a `fields.headers` block that keeps that one header and drops the rest:

```yaml
accessLog:
  filePath: "/var/log/traefik/access.log"
  bufferingSize: 50
  format: json
  fields:
    headers:
      defaultMode: drop
      names:
        User-Agent: keep # needed by CrowdSec UA scenarios and the dashboard
```

`defaultMode: drop` is what keeps cookies and auth headers out of a file on disk, so name the header you want rather than logging them all.

<img src="images/crowdsec-dashboard-mobile-decisions-http.png" width="300" alt="Expanded decision card listing the HTTP requests behind a ban"/>

## AppSec

Nothing to configure beyond the [AppSec component](https://docs.crowdsec.net/docs/appsec/intro) itself. The verdict records (`appsec-block`) and the in-band rule events both arrive through the same alert and render as one list: the rule, `blocked` or `detected`, the request line, the part of the request that matched, and the payload when the rule captured one.

## OPNsense

Nothing to configure. The `os-crowdsec` plugin's `firewallservices/*` alerts carry every port the scan touched, rather than a bare "port scan" label:

<img src="images/crowdsec-dashboard-mobile-decisions-ports.png" width="300" alt="Expanded decision card listing the ports touched by a pf scan"/>

Ports come from alert level meta rather than from individual events, because the pf parser aggregates them across the whole scan. That is why one alert lists every port at once instead of arriving as one alert per port.

If OPNsense runs your LAPI, that is the host for `LAPI_URL`. If it is an agent reporting to a LAPI somewhere else, use the LAPI host.

## A source with no parser

The ban still shows. The expanded row marks the source as **Unknown** and prints each event's raw meta as it came from CrowdSec, so you can see what the scenario recorded even before anyone writes a parser for it.

## Adding your stack

The parsers are small and self-contained, one file each in [`src/common/parsing/integrations/`](../src/common/parsing/integrations/). I am happy to add more, I just cannot test what I do not run.

Open an issue with a sample alert and I will write the parser. Get one with:

```sh
cscli alerts list
cscli alerts inspect <id> -o json
```

Paste the JSON including the `events[].meta` and top-level `meta` blocks, since those are what the parser reads. Rename any hostnames you would rather not publish first.

If you want to write it yourself, [`src/common/parsing/README.md`](../src/common/parsing/README.md) walks through adding a field, a facet or a whole integration, and which of those a new scenario actually needs (usually none: scenarios ride on log sources, and the source decides the shape of the data).
