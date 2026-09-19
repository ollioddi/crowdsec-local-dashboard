# Releasing

Releases are cut from `main` with two GitHub Actions workflows. The release
notes are a mix of a summary you write and a list generated from commits.

## 1. Write commits the generator understands

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Ends up under |
|---|---|
| `feat:` / `feat(scope):` | Features |
| `fix:` | Bug fixes |
| `perf:` | Performance |
| `docs:` | Documentation |
| `chore(deps):` | Dependencies |
| `chore:`, `refactor:`, `style:`, `test:`, `ci:`, `build:` | not listed |

Mark a breaking change with `!` after the type, and explain it in a footer.
Both end up in a "⚠ Breaking changes" section at the top of the list:

```
feat(config)!: rename LAPI_TOKEN to LAPI_BOUNCER_API_TOKEN

BREAKING CHANGE: set LAPI_BOUNCER_API_TOKEN in your environment; LAPI_TOKEN is ignored.
```

Preview what the next release would contain:

```sh
pnpm release:preview   # notes for everything since the last tag
pnpm release:version   # the version git-cliff would pick
```

## 2. Draft the release

Run the **Draft release** workflow from the Actions tab. Leave the version
empty to derive it from the commits (`feat` bumps minor, `fix` bumps patch;
breaking changes bump minor while the project is on 0.x). Pass a version
explicitly to override, and always pass one when the previous tag was a
pre-release such as `v0.3.0-beta`, since the automatic bump would only
increment the pre-release number.

The workflow opens a small prep PR that pins `docker-compose.yml` to the new
tag, and creates a **draft** GitHub release targeting `main`, with the notes
template on top and the generated list below a `<!-- generated-notes-below -->`
marker. Nothing is tagged yet. Merge the prep PR before publishing so the
tagged tree, and the image built from it, ship a compose file that pulls
their own version.

## 3. Write the summary and publish

Open the draft on GitHub and edit the text above the marker: what the release
means for users, breaking changes and how to migrate, upgrade steps. Leave the
marker and the generated list in place. Re-running the workflow, for example
after landing one more fix, regenerates the list and keeps your text.

Publish the draft. GitHub then creates the tag, which triggers:

- **Build and push Docker image**: publishes `ghcr.io/…:X.Y.Z` (no `v` prefix)
  and, for stable releases, `X.Y`. `latest` follows `main`, not releases.
- **Update changelog**: opens a pull request that prepends the release body to
  `CHANGELOG.md`, runs CI on it and merges it automatically once CI passes.
  Automatic merging needs "Allow auto-merge" enabled in the repository
  settings; without it, merge that PR by hand. The workflow can also be run
  manually with a tag to add a release that was missed.

Both the prep PR and the changelog PR are opened with the `RELEASE_TOKEN`
repository secret, a fine-grained personal access token for this repository
with Contents and Pull requests set to read and write. Pull requests opened
with the built-in workflow token never get a CI run, so the required check
would keep them blocked forever. Without the secret the PRs are still
created, but you have to close and reopen them to start CI.

A version containing a `-` (for example `v1.0.0-rc.1`) is marked as a
pre-release.
