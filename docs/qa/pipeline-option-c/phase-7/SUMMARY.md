# Phase 7 Summary — Pipeline Option C

Forked churches can opt into system template updates:

- **Updates available** when `template.version > forkedFromVersion`
- Diff shows added / removed / changed / custom / conflicts
- Merge applies adds, keeps custom stages, resolves label conflicts explicitly
- Dismiss hides the notice until the next bump

Screenshot: `diff-ui.png`

Next: **Phase 8** — docs, polish, cleanup, full regression.
