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

## Adding a parser

[Contributing a parser](contributing-a-parser.md) is its own page. It covers the two extension points (an integration for a new log source, a facet for a value that can appear on several) and what a new CrowdSec scenario actually needs, which is usually nothing. Every integration ships with a fixture test built from real `cscli alerts inspect` output, with hostnames renamed.

## Docs

Two separate projects live in this repo.

| | |
| --- | --- |
| The dashboard | root `package.json`, the pnpm workspace |
| The docs site | `docs-site/`, its own lockfile and workspace root |

`docs-site` is deliberately **not** a workspace member, so `pnpm install`, CI and the Docker build never resolve Astro. Drive it from the root instead:

```sh
pnpm docs:dev     # installs and serves on http://localhost:4321
pnpm docs:build   # what the workflow runs
```

`docs/*.md` is the source of truth. Plain markdown, no frontmatter, readable on GitHub at any tag. `docs-site` never writes back to it: `scripts/sync-docs.mjs` copies the files into the Starlight collection and adapts them.

That means a few rules when writing a page:

- Start with a single `# H1`. It becomes the page title, and the site strips it.
- Link between pages with relative paths (`configuration.md#retention`). Links to files outside `docs/` are rewritten to point at GitHub.
- Reference screenshots as `images/<name>.png`. Only referenced images are copied into the site.
- Use GitHub alerts (`> [!NOTE]`). They are converted to Starlight asides.
- Add new pages to the sidebar in `docs-site/astro.config.mjs` and to `docs/README.md`.

A push to `main` that touches `docs/` or `docs-site/` deploys the site through `.github/workflows/docs.yml`, and so does publishing or editing a release.

### The changelog page

`/changelog` is built from the GitHub releases. There is no changelog file: the release body is the only copy, so editing a published release updates the site and nothing can drift out of sync.

Unauthenticated builds work but share the 60 requests per hour GitHub allows per IP. Set `GH_API_TOKEN` to a token with `Contents: read` if you hit that while working locally. CI passes the built-in `GITHUB_TOKEN`.

### Versioning the docs

`docs/` is the unreleased version and always lives at the site root. When a release ships, freeze its docs by adding an entry to `versions` in `docs-site/site.config.mjs`. Nothing is archivable before v0.6, because `docs/` does not exist in any earlier tag.

## Screenshots

`pnpm screenshots` regenerates every image in `docs/images`. It seeds a throwaway database in `.demo/`, builds the app, drives Chromium through each view at desktop and phone sizes, and rewrites the screenshot blocks in the README.

Run it only as part of cutting a release, not after every UI change. The images live on `main` and on the docs site, so refreshing them mid-cycle shows people features that are not in any build they can pull.

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
