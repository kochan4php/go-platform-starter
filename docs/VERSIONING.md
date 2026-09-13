# Documentation versioning

The documentation portal tracks the code on `main`. Each tagged release freezes
a summary under `docs/versions/<major>.<minor>.md`; patch releases update the same
minor snapshot only for corrections. The live portal labels itself `latest` and
links the newest frozen snapshot.

Snapshots record supported code version, commit/tag, migration baseline, API
major, configuration changes, and upgrade links. They do not copy every page:
Git tags are the immutable full snapshot, while the minor page is the durable
entry point. Never rewrite a snapshot for behavior changes; add a new minor.

## How the portal is built

Docusaurus renders `docs/` in place from `website/`. The Markdown files stay
where the generators and `scripts/check-docs.mjs` expect them; only the
rendering lives in `website/`.

```sh
pnpm --filter website start   # local preview with hot reload
pnpm --filter website build   # what CI publishes
```

The structure is described once, in `website/sidebars.js`. Pages carry no
navigation front matter, so adding a document means adding one line there.

`onBrokenLinks` and `onBrokenMarkdownLinks` are both `throw`: a link that does
not resolve fails the build rather than shipping a dead page.

This replaced MkDocs in 2026-09. The earlier choice avoided a JavaScript
documentation application on a Markdown-first repository, and that reasoning was
sound — the cost here is roughly a thousand transitive packages. It was reversed
for the reading experience: grouped sidebar, working local search over sixty-odd
pages, and dark mode. Publishing requires the repository's Pages source to be
**GitHub Actions**; on "Deploy from a branch" the deploy step fails with a 404.
