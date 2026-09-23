# Integrations

Decisions and hosts work with any CrowdSec setup. What is stack-specific is the **alert evidence** in the expanded row: the paths that were hit, the ports that were scanned, the usernames that were tried. That is parsed per log type, so a stack with no parser still shows the ban, just without the breakdown.

| Log type | Source | Evidence shown |
|---|---|---|
| `http_access-log` | [Traefik](integrations/traefik.md) | One line per request: verb, host and path, status, time, router, user agent |
| `appsec-block`, in-band rule events | [CrowdSec AppSec (WAF)](integrations/appsec.md) | The rule that fired, whether the request was blocked, what matched, the ids that tie it to the log |
| `pf_drop`, `pf_pass` | [OPNsense](integrations/opnsense.md) | The ports touched, and the connections grouped by interface, protocol and rule |
| `ssh_auth`, `auth` | [sshd](integrations/ssh.md) | The usernames tried, one line per attempt |

I run Traefik, the AppSec component and OPNsense, so those are the ones this is actually tested on. The `sshd` parser is written from the collection's documented fields, not from live data.

## What every source gets

Whatever wrote the log line, the box has the same shape. The header names the scenario, the source, how many events over what window and when, then a labelled line with the scenario version, the bucket that fired, the scope, whether it was remediated and the alert id. CVE and technology tags from the scenario and the JA4H client fingerprint follow when the alert carries them. GeoIP, the reporting agent and the log it read sit in the facts column beside the box.

Two sections at the bottom catch the rest: **Other fields** lists every value a parser read but the box does not draw, and **Not parsed** lists every key no parser reads at all, so a new CrowdSec field is visible the day it appears.

<img src="images/crowdsec-dashboard-desktop-decisions-expanded.png" width="800" alt="An expanded decision on a desktop: the evidence on the left, the facts column on the right"/>

## A source with no parser

The ban still shows. The expanded row marks the source as **Unknown** and prints each event's raw meta as it came from CrowdSec, so you can see what the scenario recorded even before anyone writes a parser for it.

## Adding your stack

The parsers are small and self-contained, one file each in [`src/common/parsing/integrations/`](../src/common/parsing/integrations/). There are two ways to get yours in.

**Want me to write it?** [Open an issue](https://github.com/ollioddi/crowdsec-local-dashboard/issues/new) with a sample alert. I am happy to add sources, I just cannot test what I do not run, so the sample is what makes it possible. Get one with:

```sh
cscli alerts list
cscli alerts inspect <id> -o json
```

Paste the JSON including the `events[].meta` and top-level `meta` blocks, since those are what the parser reads. Rename any hostnames you would rather not publish first.

**Want to write it yourself?** [Contributing a parser](contributing-a-parser.md) walks through adding a field, a facet or a whole integration, and which of those a new scenario actually needs. Usually none: scenarios ride on log sources, and the source decides the shape of the data.
