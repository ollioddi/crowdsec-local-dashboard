# Captured alert fixtures

Small metadata samples are kept inline in tests. Larger captured alerts are JSON files here, shared by parser tests, evidence tests and demo seeding. The current files contain Dovecot and Postfix alerts from mailcow.

## Dovecot and Postfix

Captured from a live CrowdSec LAPI on 2026-09-29 through `docker exec crowdsec cscli alerts list --limit 0 -o json`.

The Dovecot and postscreen fixtures are the reported four-event and one-event alerts. The other two fixtures cover smtpd categories found during the same audit. Only the scenario, bucket, time window and event fields used by tests and demo seeding are retained. Source IPs, source ranges and container IDs are replaced with documentation values.

Event timestamps and alert start/stop timestamps differ by two hours in the source captures. Tests preserve that discrepancy; demo screenshots shift event timestamps to the demo alert window. No missing usernames, rejection reasons or log messages have been invented.

The evidence tests reuse these events with context values observed in the dashboard's retained alerts on 2026-10-05. They cover login details, newline-only greetings, HTTP and TLS-like input, and disconnect stages. These are test combinations, not extra captured alerts. Mailbox names and password-hash fragments use demo values.
