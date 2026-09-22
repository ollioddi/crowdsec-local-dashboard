# Contributing

Everything here is for working on the dashboard. Running it is covered in the [README](../README.md).

## Guidelines
Contributions are welcome and appreciated. However please follow a few simple rules:
- No AI slop. I'm fine with the use of AI tools for assistance, but all contributions must be reviewed and edited by a human before submission. Be transparent about any AI assistance used, please :-)
- Try and match the existing code style and conventions used throughout the project.
- Keep commit messages clear and descriptive, following the Conventional Commits specification. This ensures your change will be properly categorized in the changelog, and understood by others.

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

`pnpm screenshots` regenerates every image in `docs/images`. It seeds a throwaway database in `.demo/`, builds the app, drives Chromium through each view at desktop and phone sizes, and rewrites the screenshot blocks in the README. Run it after any change to the UI.

The first run needs a browser: `pnpm exec playwright install chromium`.

| Flag | Effect |
| --- | --- |
| `--only=<name>` | Capture only scenes whose name matches |
| `--keep-data` | Reuse the database from the last run |
| `--no-build` | Reuse the last production build |
| `--no-readme` | Leave README.md alone |

The demo addresses come from reserved ranges, so nothing in the images needs blurring. Add or change a shot by editing the `scenes` list in `scripts/screenshots.ts`, where each entry carries its own README caption.

## Releasing

See [Releasing](releasing.md). Commits follow Conventional Commits, a workflow drafts the release with a generated change list, and the summary is written by hand before publishing.
