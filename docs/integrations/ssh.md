# SSH

Log types `ssh_auth` and `auth`, from the CrowdSec `sshd` collection on any agent that ships `/var/log/auth.log`. Covers `crowdsecurity/ssh-bf` and friends.

## What the box shows

The usernames the scenario counted, as chips, then one line per attempt LAPI kept: the user, the service, and the time.

<table>
  <tr>
    <td><img src="../images/crowdsec-dashboard-desktop-decisions-ssh.png" width="620" alt="An SSH brute force expanded on a desktop: the usernames tried, then one line per attempt"/></td>
    <td><img src="../images/crowdsec-dashboard-mobile-decisions-ssh.png" width="200" alt="The same alert as a sheet on a phone"/></td>
  </tr>
</table>

The chips can list more names than the lines below them. The scenario counts every username it saw, while CrowdSec keeps only a window of the log lines behind an alert.

## Setup

Nothing to configure. This parser is written from the collection's documented fields rather than from live data, so if yours renders differently, [open an issue with a sample alert](../integrations.md#adding-your-stack).
