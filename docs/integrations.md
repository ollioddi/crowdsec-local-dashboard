# Integrations

Decisions and hosts work with any CrowdSec setup. What is stack-specific is the **alert evidence** in the expanded row: the paths that were hit, the ports that were scanned, the usernames that were tried. That is parsed per log type, so a stack with no parser still shows the ban, just without the breakdown.

| Log type | Source | Evidence shown |
|---|---|---|
| `http_access-log` | Traefik | Request paths, verb, status, user agent, router |
| `pf_drop`, `pf_pass` | OPNsense | Destination ports, interface, rule number |
| `ssh_auth`, `auth` | CrowdSec `sshd` collection | Targeted usernames |

I run Traefik and OPNsense, so those two are the ones this is actually tested on.

## Traefik

Traefik does not log request headers by default, so there is no user agent in the line and the `UA:` row at the foot of the expanded row stays empty. A minimal `accessLog` block is enough for everything else:

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

## OPNsense

Nothing to configure. The `os-crowdsec` plugin's `firewallservices/*` alerts carry every port the scan touched, rather than a bare "port scan" label:

<img src="images/crowdsec-dashboard-mobile-decisions-ports.png" width="300" alt="Expanded decision card listing the ports touched by a pf scan"/>

Ports come from alert level meta rather than from individual events, because the pf parser aggregates them across the whole scan. That is why one alert lists every port at once instead of arriving as one alert per port.

If OPNsense runs your LAPI, that is the host for `LAPI_URL`. If it is an agent reporting to a LAPI somewhere else, use the LAPI host.

## Adding your stack

The parsers are small and self-contained, one file each in `src/common/alert-types/`. I am happy to add more, I just cannot test what I do not run.

Open an issue with a sample alert and I will write the parser. Get one with:

```sh
cscli alerts list
cscli alerts inspect <id> -o json
```

Paste the JSON including the `events[].meta` block, since that is what the parser reads.
