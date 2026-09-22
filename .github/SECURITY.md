# Security policy

## Reporting a vulnerability

Report it privately through GitHub: open the [Security tab](https://github.com/ollioddi/crowdsec-local-dashboard/security) and use **Report a vulnerability**. That opens a private advisory only you and I can see.

Please do not open a public issue for anything exploitable.

I maintain this in my spare time, so expect a first reply in days rather than hours.

## Supported versions

The project is in beta and only the latest release gets fixes. There are no backports to earlier tags.

## Scope

The dashboard holds a session cookie, local user accounts and your CrowdSec LAPI credentials, and it can delete decisions through LAPI. Anything that lets an unauthenticated visitor read or change those is in scope, as is anything that leaks the LAPI credentials or the session secret.

Out of scope:

- Findings that need an already-authenticated admin session. Every account is an operator by design.
- Reaching the dashboard over plain HTTP. That is a documented deployment choice, not a defect. See [deployment](https://github.com/ollioddi/crowdsec-local-dashboard/blob/main/docs/deployment.md).
- Vulnerabilities in CrowdSec itself. Report those to [CrowdSec](https://github.com/crowdsecurity/crowdsec/security).
