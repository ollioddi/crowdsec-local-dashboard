# AppSec WAF

Log type `appsec-block`, plus the in-band rule events the AppSec datasource emits without any log type. Both describe the same thing and render as one list.

## What the box shows

One block per rule hit: the verdict, `deny` when the request was actually interrupted and `detected` when the rule only matched, the rule name and its description, and the time. Then the request line, and labelled rows for the part of the request that matched, the payload when the rule captured one, the rule ids, the request uuid that ties the verdict to the access-log line, and the bouncer that asked for it.

<table>
  <tr>
    <td><img src="../images/crowdsec-dashboard-desktop-decisions-appsec.png" width="620" alt="A virtual-patch alert expanded on a desktop: two rules, each with its verdict, request and ids"/></td>
    <td><img src="../images/crowdsec-dashboard-mobile-decisions-appsec.png" width="200" alt="The same alert as a sheet on a phone"/></td>
  </tr>
</table>

## Setup

Nothing to configure beyond the [AppSec component](https://docs.crowdsec.net/docs/appsec/intro) itself. The log the facts column names is `appsec`, since the events arrive in band rather than from a file.
