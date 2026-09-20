# Contributing

Everything here is for working on the dashboard. Running it is covered in the
[README](README.md).

## Setup

```sh
pnpm install
cp .env.example .env   # fill in your values
pnpm run db:push       # creates the SQLite schema and generates the Prisma client
pnpm run dev           # start dev server on http://localhost:3000
```

Before opening a pull request:

```sh
pnpm typecheck
pnpm check             # biome lint and format
pnpm test
pnpm build
```

## Screenshots

`pnpm screenshots` regenerates every image in the README. It seeds a throwaway
database in `.demo/`, builds the app, drives Chromium through each view at
desktop and phone sizes, and rewrites the screenshot blocks in the README. Run
it after any change to the UI.

The first run needs a browser: `pnpm exec playwright install chromium`.

| Flag | Effect |
| --- | --- |
| `--only=<name>` | Capture only scenes whose name matches |
| `--keep-data` | Reuse the database from the last run |
| `--no-build` | Reuse the last production build |
| `--no-readme` | Leave README.md alone |

The demo addresses come from reserved ranges, so nothing in the images needs
blurring. Add or change a shot by editing the `scenes` list in
`scripts/screenshots.ts`, where each entry carries its own README caption.

## Releasing

See [RELEASING.md](RELEASING.md). Commits follow Conventional Commits, a
workflow drafts the release with a generated change list, and the summary is
written by hand before publishing.
