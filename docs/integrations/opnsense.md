# OPNsense

Log types `pf_drop` and `pf_pass`, from the `os-crowdsec` plugin's `firewallservices/*` scenarios.

## What the box shows

The ports the scan touched, as chips, then the connections folded into one line per distinct interface, protocol and rule, each with how many packets hit it and the span they arrived over. A scan that crossed two interfaces shows both rather than whichever came first. The firewall hostname and the full rule id sit under each line.

<table>
  <tr>
    <td><img src="../images/crowdsec-dashboard-desktop-decisions-ports.png" width="620" alt="A port scan expanded on a desktop: the ports probed, then the dropped connections grouped by rule"/></td>
    <td><img src="../images/crowdsec-dashboard-mobile-decisions-ports.png" width="200" alt="The same alert as a sheet on a phone"/></td>
  </tr>
</table>

Ports come from alert level meta rather than from individual events, because the pf parser aggregates them across the whole scan. That is why one alert lists every port at once instead of arriving as one alert per port.

## Setup

Nothing to configure. If OPNsense runs your LAPI, that is the host for `LAPI_URL`. If it is an agent reporting to a LAPI somewhere else, use the LAPI host.
