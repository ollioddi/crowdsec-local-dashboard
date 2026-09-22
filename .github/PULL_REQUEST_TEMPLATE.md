<!-- One or two lines: what was broken or missing, from a user's point of view. -->

<!--
If there is a non-obvious root cause, lead with it. That is the part reviewers and release notes actually need:

> [!IMPORTANT]
> The toaster read its theme from `next-themes`, whose provider is not mounted anywhere in this app, so `useTheme()` always returned "system".

Then what changed, as bullets. A before/after table if there are numbers. Screenshots for anything visual.

Commits follow Conventional Commits, and the subject lines become the release notes, so `feat:` and `fix:` are what readers see. Add a `Changelog: skip` trailer to keep contributor-only work out of them. See docs/releasing.md.
-->
