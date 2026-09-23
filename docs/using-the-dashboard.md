# Getting the most out of it

Things the interface is telling you that are easy to miss.

## Every view is a URL

Page, page size, sorting, filters, search, expanded rows and visible columns are all validated search params. A refresh, a live update or a link you paste into a chat all restore the same view, so a filtered table is worth bookmarking.

The decisions table shows five columns by default. Status, origin, country and created date are still there for filtering and sorting, just hidden. Turn them on from the Columns menu.

Filters sit behind the Filter button as chips, with per column operators and facet counts.

## Live does not mean LAPI is fine

The **Live** dot only says your browser is connected to the server. It says nothing about whether the server can reach CrowdSec.

When a poll fails, a banner at the top of every page shows the error and the time of the last successful sync, and clears itself on the next good poll. If `LAPI_URL` or the bouncer token are missing, the banner says that instead of showing a connection error.

The banner also calls out missing watcher credentials separately, because that failure is otherwise invisible: decisions keep syncing, the expanded rows are just always empty.

## Reading a decision

**Click anywhere on a row** to expand it. Clicks on a link or a button inside the row still do their own thing.

**Ban duration is derived, not reported.** LAPI only ever hands over the time remaining, on both the decision stream and the alerts endpoint, so a raw value would be whatever was left at the moment the sync happened to run. The dashboard measures from the triggering alert to the expiry instead, which lands on whole hours and reads `4 hours`. A decision with no linked alert says so rather than guessing.

**`overdue`** means the decision is still marked active but its expiry has passed.

**Simulated decisions** are reported by LAPI but enforced by nobody. They are flagged, because otherwise they look exactly like a real ban and imply protection that is not there.

**Scope** distinguishes a Range ban from a single IP ban.

**Origin** says who decided: `crowdsec` for your own agents, `cscli` for manual bans, and `CAPI`, `lists` or `console` when [`LAPI_DECISION_ORIGINS`](configuration.md#crowdsec-lapi) is opened up to include them.

Relative times tick live. Country codes are spelled out next to the flag.

## The alert evidence

Expanding a decision splits into two columns on a desktop, and stacks into a sheet on a phone. The left column is the evidence, one box per linked alert. Top to bottom:

- **The header**: the scenario, which log source the alert came from, a `simulated` badge when relevant, how many events over what window, and when. Under it, labelled: the scenario version, the bucket that fired (`10 leaking 10s` means ten hits inside a ten second leak window tripped it, the difference between a burst and a slow crawl), the scope, whether it was remediated, and the alert id.
- **Client tags**: CVE and technology tags from the scenario, and the JA4H fingerprint, which survives a scanner rotating IPs and forging its user agent.
- **The evidence itself**, shaped by the source: request lines for HTTP with the router, user agent and query size on each, the rule and verdict for AppSec with the ids that tie it to the access log, the ports and grouped connections for a firewall scan, the usernames for SSH. Every line of a list has the same shape, so nothing appears or vanishes depending on the other lines. See [Integrations](integrations.md) for what each one shows. An alert that mixes sources renders each of them.
- **Other fields** and **Not parsed**, inline: everything else the alert carried. Other fields is what a parser read but the box does not draw; Not parsed is every key no parser reads, kept so nothing CrowdSec sends is silently dropped.

The right column has the same six facts for every decision: location, network, the agent that reported it, the log it read, when it was first seen, and the ban length, with the remove and CrowdSec CTI buttons under them. A value the sync does not have reads as Unknown rather than disappearing.

What each source puts in the box is on its own page under [Integrations](integrations.md).

## On a phone

The table becomes a list of cards, and expanding one opens a sheet over the list rather than growing the card, so filters and the open row stop competing for the screen. The sheet carries everything the desktop row does, in the same order. Filters take one row however many there are, scrolling sideways, with Clear pinned first.

Improving a parser improves the rows already in the database: the raw events are stored and re-read every time a row is expanded, so nothing needs a re-sync.

## Deleting a decision

Deleting removes it from CrowdSec, which unbans the host, so it asks first.

If CrowdSec no longer holds the decision, that counts as already gone and the row is cleared rather than erroring, so a stale row can always be removed.

## Hosts

A host with no active decisions but bans on record links through to its expired decisions rather than an empty list.

ASN and country enrichment comes from alerts, which means it needs the watcher credentials. Without them hosts have IPs and counts but no network data.

## History sticks around

Expired bans stay visible after CrowdSec has forgotten them, which is the point of the local database. [`DECISION_RETENTION_COUNT` and `DECISION_RETENTION_DAYS`](configuration.md#retention) decide how much is kept. Age is applied first, then the count.

## Installing it as an app

It installs to a phone home screen or a desktop, starting on the decisions list, with long-press shortcuts to Decisions and Hosts.

> [!NOTE]
> Installing needs a secure context. Over plain HTTP at an IP, which is the default setup, you get the theming but no install prompt and no offline page. Serve it over HTTPS to install it.

Nothing about your data is cached. The app is auth-gated and rendered per request, so the service worker holds only hashed assets and an offline page, never HTML or an API response.

## Version and updates

The sidebar footer shows the version the build was made from. Unless `UPDATE_CHECK=false`, the server asks GitHub for the newest release a few times a day and the badge reads **Update available** when there is one. Local and untagged builds show `dev` and are never flagged.
