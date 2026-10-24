# Deployment

Docker Compose is the recommended approach for homelab use. The container applies any pending schema changes on every startup and then launches the server.

> [!TIP]
> At some point I want to provide a Helm chart for easier Kubernetes deployment. If you are interested in this, let me know. I might be able to speed up the timeline on that.

## The container

The image runs as the unprivileged `node` user (uid 1000), keeps its own files read-only, and needs no Linux capabilities. The bundled compose file also mounts the root filesystem read-only and drops every capability.

The image ships a `HEALTHCHECK` that polls `/healthz`. The probe is baked into the image, so updating the image needs no Compose health-check change. The endpoints are:

- `GET /livez`: returns `200` when the HTTP server can respond. Use this for Kubernetes liveness probes.
- `GET /healthz`: returns `200` after auth initializes, or `503` if auth initialization fails or configured OIDC was skipped. Docker polls this endpoint; it does not repeat OIDC discovery.
- `GET /readyz`: returns `200` only after startup completes, auth is healthy, the database responds, and configured LAPI sync has succeeded without a current error. It also checks LAPI connectivity and, when watcher credentials are configured, that alerts can be fetched. The LAPI result is reused for 30 seconds, so probing it often does not add LAPI traffic. Use this for Kubernetes readiness probes. It returns `503` during startup, shutdown, or dependency failure. Unconfigured optional integrations do not block readiness.

`/api/health` has been removed.

Failed OIDC discovery can leave the provider unavailable until the dashboard restarts. Once your identity provider is reachable again, run `docker compose up -d dashboard` if the container is stopped, or `docker compose restart dashboard` if it is running, from your deployment's compose directory. Docker marks a failed health check as unhealthy; `restart: unless-stopped` does not restart a container solely because it is unhealthy.

The sidebar shows the running version and, unless `UPDATE_CHECK=false`, the newest release on GitHub.

## Updating

The compose file pins the release it was downloaded with. To move to a newer release, download it again and pull:

```sh
curl -o docker-compose.yml https://raw.githubusercontent.com/ollioddi/crowdsec-local-dashboard/main/docker-compose.yml
docker compose pull
docker compose up -d
```

Check the [release notes](https://github.com/ollioddi/crowdsec-local-dashboard/releases) first, since some releases need configuration changes.

The SQLite database lives in a Docker volume (`db`) and survives updates.

SQLite runs in WAL mode, so `app.db-wal` and `app.db-shm` appear next to `app.db` while the server is up. Keep `/data` on a local disk: WAL does not work on network shares such as NFS or SMB, and the server logs a warning when it has to fall back. To back up a running instance, copy all three files together or use `sqlite3 app.db ".backup backup.db"`.

> [!NOTE]
> While the project is in beta, use tagged releases rather than the `main` branch to avoid unexpected breaking changes.

## Behind a reverse proxy

Set `BETTER_AUTH_URL` to the public URL for any proxied deployment. It marks the session cookie `Secure` over HTTPS and fixes the origin that sign-in checks against. If sign-in fails with “Invalid origin”, check that this URL matches the address used in the browser.

The dashboard holds a Server-Sent Events stream open for live updates and sends a `ping` event every 20 seconds. Turn response buffering off for it and keep the read timeout above 20 seconds, or the Live indicator flaps as the proxy drops the connection.

### Exposing the dashboard

Once a proxy is in front, make the proxy the only way in:

- Publish the port on loopback only (`127.0.0.1:3000:3000`), or drop `ports:` and put the dashboard on the proxy's Docker network. Docker-published ports bypass ufw and firewalld, so `3000:3000` stays reachable from the network even when the firewall says otherwise.
- Never port-forward `3000` from your router. Plain HTTP skips TLS, the `Secure` cookie and anything the proxy enforces.
- Do not route `/livez`, `/healthz` and `/readyz` publicly. Docker and Kubernetes reach them directly, and `/readyz` checks LAPI on every request.
- Set HSTS and a request body limit at the proxy. The dashboard never receives large uploads, so 1 MB is plenty:
  - nginx: `client_max_body_size 1m;` (also the nginx default)
  - Caddy: `request_body { max_size 1MB }`
  - Traefik: the `buffering` middleware with `maxRequestBodyBytes: 1048576`. It also buffers responses, which breaks the live stream, so attach it to a router that excludes `/sse/`.

### LAPI over HTTPS

The bouncer key and machine password travel to LAPI on every sync. If LAPI is not on the same host, serve it over HTTPS and use an `https://` `LAPI_URL`. For a certificate from a private CA, mount the CA file and point `NODE_EXTRA_CA_CERTS` at it.

## Upgrading from 0.5 or earlier

The compose file no longer carries the settings. They come from a `.env` beside it, read through `env_file`, and the file is optional. After downloading a new compose file, copy `.env.example` to `.env` next to it and move your settings there. Keeping your old compose file with inline values also works.

Only the database path stays in the compose file, so a developer's `.env` cannot point the container at `./dev.db`.

## Upgrading from 0.4.x or earlier

Those releases ran as root, so the database in the `db` volume is owned by root and the new image cannot write to it. Fix the ownership once before starting the new version:

```sh
docker compose run --rm --user root --cap-add CHOWN --entrypoint chown dashboard -R node:node /data
docker compose up -d
```

The container refuses to start and prints this command if the volume is still owned by root.

A volume from 0.2.x or earlier cannot be upgraded at all: those releases created the database without migration history, and 0.3.0 already required a reset. The container explains this too. Start over with `docker compose down -v && docker compose up -d`.

## Running without Docker

Use a long-running Node.js process with persistent, writable storage for SQLite. From a checkout of the repository:

```sh
pnpm install
cp .env.example .env
```

Edit `.env`, including `DATABASE_URL`, `BETTER_AUTH_SECRET` and the LAPI credentials. Then run:

```sh
pnpm db:generate
pnpm exec dotenv -e .env -- prisma migrate deploy
pnpm build
pnpm exec dotenv -e .env -- node .output/server/index.mjs
```

Use a service manager to restart the process and preserve the database file between deployments. The sync loop and live event streams require a running server; a short-lived serverless function is not a drop-in replacement for this deployment.

> [!IMPORTANT]
> If your LAPI is only reachable on a local network, the dashboard has to run on that network too, for example via Docker on the same host or over a VPN.
