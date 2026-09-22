# CrowdSec LAPI Setup

The dashboard authenticates with your Local API in two ways. Both are needed: the watcher credentials stream the alert evidence, the bouncer token reads decisions.

> [!NOTE]
> This dashboard talks only to your **local** LAPI. It never contacts the CrowdSec Central API (CAPI).

## Watcher credentials (machine ID + password)

These are the credentials your CrowdSec agent already uses. It should exist at this path:

```sh
cat /etc/crowdsec/local_api_credentials.yaml
```

If it does not exist there, check for any custom setup in your CrowdSec configuration.

Copy `login` into `LAPI_MACHINE_ID` and `password` into `LAPI_MACHINE_PASSWORD`.

Without these the dashboard still lists decisions, but the expanded row has no alert evidence and no ASN data to show.

## Bouncer API token

Create a dedicated bouncer on your CrowdSec host:

```sh
cscli bouncers add crowdsec-local-dashboard
```

Copy the generated token into `LAPI_BOUNCER_API_TOKEN`. It is only shown once.

Note that the dashboard will show up in your CrowdSec bouncers list as `crowdsec-local-dashboard`. If you want, you can freely change the name. You just need the token.

## Reachability

`LAPI_URL` is the base URL including port, for example `http://192.168.1.100:8080`. The dashboard must be able to reach it from wherever it runs. If LAPI is only bound to localhost on the CrowdSec host, run the dashboard on that host or expose LAPI on the local network first.
