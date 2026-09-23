# Contributing

For installation and use, see the [README](../README.md). This page covers local development.

## Guidelines
Contributions are welcome and appreciated. However please follow a few simple rules:
- No AI slop. I'm fine with the use of AI tools for assistance, but all contributions must be reviewed and edited by a human before submission. Be transparent about any AI assistance used, please :-)
- Try and match the existing code style and conventions used throughout the project.
- Keep commit messages clear and descriptive, following the Conventional Commits specification. This ensures your change will be properly categorized in the changelog, and understood by others.

## Setup

```sh
pnpm install
cp .env.example .env   # fill in your values
pnpm run db:generate   # generate the Prisma client and Zod schemas
pnpm run db:push       # create the local SQLite schema
pnpm run dev           # start dev server on http://localhost:3000
```

Before opening a pull request:

```sh
pnpm typecheck
pnpm check             # biome lint and format
pnpm test
pnpm build
```

## Adding a parser

See [Contributing a parser](contributing-a-parser.md) for the files to change, a complete integration example and fixture tests. It also explains when to extend an existing parser instead.

## Docs

Two separate projects live in this repo.

| | |
| --- | --- |
| The dashboard | root `package.json`, the pnpm workspace |
| The docs site | `docs-site/`, its own lockfile and workspace root |

The docs site has separate dependencies. Installing or building the dashboard does not install Astro. From the repository root, run:

```sh
pnpm docs:dev     # installs and serves on http://localhost:4321
pnpm docs:build   # what the workflow runs
```

You can also run `pnpm install` and `pnpm dev` inside `docs-site/`.

Edit Markdown files under `docs/`, including its subfolders. They have no frontmatter and render on GitHub as well as the site. `docs-site/scripts/sync-docs.mjs` copies them into the Starlight collection; do not edit the generated copies.

That means a few rules when writing a page:

- Start with a single `# H1`. It becomes the page title, and the site strips it.
- Link between pages with relative paths (`configuration.md#retention`). Links to files outside `docs/` are rewritten to point at GitHub.
- Reference screenshots as `images/<name>.png`, or `../images/<name>.png` from a page in a subfolder. Only referenced images are copied into the site. References for upcoming release captures can stay in the Markdown: missing files render as “Screenshot pending for this release” on the site, and sync reports their names.
- Use GitHub alerts (`> [!NOTE]`). They are converted to Starlight asides.
- Add new pages to the sidebar in `docs-site/astro.config.mjs` and to `docs/README.md`.

A push to `main` that touches `docs/` or `docs-site/` deploys the site through `.github/workflows/docs.yml`, and so does publishing or editing a release.

### The changelog page

`/changelog` is built from the GitHub releases. There is no changelog file: the release body is the only copy, so editing a published release updates the site and nothing can drift out of sync.

Unauthenticated builds work but share the 60 requests per hour GitHub allows per IP. Set `GH_API_TOKEN` to a token with `Contents: read` if you hit that while working locally. CI passes the built-in `GITHUB_TOKEN`.

### Versioning the docs

`docs/` is the unreleased version and always lives at the site root. When a release ships, freeze its docs by adding an entry to `versions` in `docs-site/site.config.mjs`. Nothing is archivable before v0.6, because `docs/` does not exist in any earlier tag.

## Testing offline behaviour

The service worker registers during development on `http://localhost:3000`. Load the app once and check that the worker is active in DevTools before testing offline behaviour. In the Network panel, select Offline:

- With the app open, the offline banner and grey Offline indicator should appear, and a page without loaded data should say it is waiting, provided its code finished preloading.
- Reload while offline and you should get the "No connection" page from `public/offline.html`, which reloads itself when you set the panel back to Online.
- Block requests to `/_serverFn/` instead of going offline to see the retry panel for an unreachable server.

A LAN IP over plain HTTP is not a secure context, so no worker registers there and the offline page cannot appear. Test on localhost or behind HTTPS.

## Screenshots

`pnpm screenshots` generates the configured captures in `docs/images`. It seeds a throwaway database in `.demo/`, builds the app, drives Chromium through each view at desktop and phone sizes, and rewrites the screenshot blocks in the README.

Run it only as part of cutting a release, not after every UI change. Keep references for planned captures in the docs until then; the site displays placeholders for missing files.

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
