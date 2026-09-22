# Releasing

Releases are cut from `main` with the **Draft release** workflow. The release notes are a mix of a summary you write and a list generated from commits, and that release body is the only changelog the project keeps.

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

Mark a breaking change with `!` after the type, and explain it in a footer. Both end up in a "⚠ Breaking changes" section at the top of the list:

```
feat(config)!: rename LAPI_TOKEN to LAPI_BOUNCER_API_TOKEN

BREAKING CHANGE: set LAPI_BOUNCER_API_TOKEN in your environment; LAPI_TOKEN is ignored.
```

A commit that would otherwise be listed can be kept out of the notes with a `Changelog: skip` trailer. Use it for work that only concerns contributors, such as the screenshot tooling:

```
docs(readme): refresh the screenshots

Changelog: skip
```

Preview what the next release would contain:

```sh
pnpm release:preview   # notes for everything since the last tag
pnpm release:version   # the version git-cliff would pick
```

Each entry links to its pull request when git-cliff can ask GitHub which PR the commit came from. The workflow has a token; locally, prefix the preview with `GITHUB_TOKEN=$(gh auth token)` to see the links.

## 2. Draft the release

Run the **Draft release** workflow from the Actions tab. Leave the version empty to derive it from the commits (`feat` bumps minor, `fix` bumps patch; breaking changes bump minor while the project is on 0.x). Pass a version explicitly to override, and always pass one when the previous tag was a pre-release such as `v0.3.0-beta`, since the automatic bump would only increment the pre-release number.

The workflow opens a small prep PR that pins `docker-compose.yml` to the new tag, and creates a **draft** GitHub release targeting `main`, with the notes template on top and the generated list below a `<!-- generated-notes-below -->` marker. Nothing is tagged yet. Merge the prep PR before publishing so the tagged tree, and the image built from it, ship a compose file that pulls their own version.

## 3. Write the summary and publish

Open the draft on GitHub and edit the text above the marker: what the release means for users, breaking changes and how to migrate, upgrade steps. Leave the marker and the generated list in place. Re-running the workflow, for example after landing one more fix, regenerates the list and keeps your text.

> [!IMPORTANT]
> Merge the prep PR before publishing. The draft targets `main`, so publishing first tags a tree whose compose file still pulls the previous release. The image build asserts the pin and fails loudly if you get the order wrong.

Publish the draft. GitHub then creates the tag, which triggers:

- **Build and push Docker image**: publishes `ghcr.io/…:X.Y.Z` (no `v` prefix) and, for stable releases, `X.Y`. `latest` follows `main`, not releases.
- **Docs**: rebuilds the site, so `/changelog` picks the release up. It reads the releases directly, so editing a published release updates the site too.

There is no changelog file to maintain. The release body is the changelog, and the docs site renders every release from the GitHub API.

The prep PR is opened with the `RELEASE_TOKEN` repository secret, a fine-grained personal access token for this repository with Contents and Pull requests set to read and write. Pull requests opened with the built-in workflow token never get a CI run, so the required check would keep them blocked forever. Without the secret the PR is still created and the workflow warns, but you have to merge it by hand.

A version containing a `-` (for example `v1.0.0-rc.1`) is marked as a pre-release.
