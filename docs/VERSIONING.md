# Documentation versioning

The documentation portal tracks the code on `main`. Each tagged release freezes
a summary under `docs/versions/<major>.<minor>.md`; patch releases update the same
minor snapshot only for corrections. The live portal labels itself `latest` and
links the newest frozen snapshot.

Snapshots record supported code version, commit/tag, migration baseline, API
major, configuration changes, and upgrade links. They do not copy every page:
Git tags are the immutable full snapshot, while the minor page is the durable
entry point. Never rewrite a snapshot for behavior changes; add a new minor.

The portal uses MkDocs core with its maintained built-in theme because the
repository is Markdown-first and does not need a JavaScript documentation
application. Material was not selected because it is approaching end of life;
Docusaurus was not selected because this portal needs no client application or
large JavaScript dependency tree. Re-evaluate the theme before MkDocs 2.x.
Build it with:

```sh
python -m pip install -r requirements-docs.txt
mkdocs build --strict
mkdocs serve
```
