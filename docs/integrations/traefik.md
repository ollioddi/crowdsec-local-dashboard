# Traefik

Log type `http_access-log`, read by the `crowdsecurity/traefik-logs` parser. Covers every `crowdsecurity/http-*` scenario and the CVE scenarios that match on a request path.

## What the box shows

One line per request, always the same shape: the verb, the host the client asked for and the path, the status, and the time. Under each line, labelled: the Traefik router that answered, the auth user when the request carried one, the query string size, and the user agent. Nothing moves between lines depending on what the other lines contain.

<table>
  <tr>
    <td><img src="../images/crowdsec-dashboard-desktop-decisions-expanded.png" width="620" alt="An HTTP probe expanded on a desktop: one line per request with router and user agent under each"/></td>
    <td><img src="../images/crowdsec-dashboard-mobile-decisions-http.png" width="200" alt="The same alert as a sheet on a phone"/></td>
  </tr>
</table>

A probe against a hostname that does not exist lands on the error-pages router. That pairing, the name asked for and the router that answered, is the whole story of that kind of alert.

## Logging enough

Traefik does not log request headers by default, so there is no user agent in the line and that label never appears. A minimal `accessLog` block is enough for everything else:

```yaml
accessLog:
  filePath: "/var/log/traefik/access.log"
  bufferingSize: 50
```

Paths, methods and status codes all come through with that, and the parser reads both JSON and CLF.

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
