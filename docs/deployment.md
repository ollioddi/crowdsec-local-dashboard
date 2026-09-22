# Deployment

Docker Compose is the recommended approach for homelab use. The container applies any pending schema changes on every startup and then launches the server.

> [!TIP]
> At some point I want to provide a Helm chart for easier Kubernetes deployment. If you are interested in this, let me know. I might be able to speed up the timeline on that.

## The container

The image runs as the unprivileged `node` user (uid 1000), keeps its own files read-only, and needs no Linux capabilities. The bundled compose file also mounts the root filesystem read-only and drops every capability.

`GET /api/health` answers `200` as soon as the server is up, and the image ships a `HEALTHCHECK` that polls it. It is a liveness check only and never touches the database.

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

> [!NOTE]
> While the project is in beta, use tagged releases rather than the `main` branch to avoid unexpected breaking changes.

## Behind a reverse proxy

Set `BETTER_AUTH_URL` to the public URL. Without it, sign-in fails with a 403 "Invalid origin", and the session cookie is not marked `Secure` even though you are serving HTTPS.

The dashboard holds a Server-Sent Events stream open for live updates and sends a keepalive comment every 20 seconds. Turn response buffering off for it and keep the read timeout above 20 seconds, or the Live indicator flaps as the proxy drops the connection.

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

## Other platforms

TanStack Start deploys to many platforms. As long as the runtime can reach your LAPI at `LAPI_URL`, it will work:

| Platform | Notes |
|---|---|
| **Node.js** | Clone the repo, then `pnpm run build && node .output/server/index.mjs` |
| **Railway** | Connect your GitHub repo, zero config required |
| **Vercel / Netlify** | Serverless; requires LAPI to be reachable from the edge |
| **Bun** | Replace the start command with `bun .output/server/index.mjs` |

See the [TanStack Start hosting docs](https://tanstack.com/start/latest/docs/framework/react/hosting) for the full list. While I haven't tested these, it should be a viable option for most users.

> [!IMPORTANT]
> If your LAPI is only reachable on a local network, the dashboard has to run on that network too, for example via Docker on the same host or over a VPN.
