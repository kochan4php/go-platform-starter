# Documentation archive policy

Documentation is archived when it describes unsupported behavior, is replaced
by an accepted ADR/guide, or has had no valid owner after two review cycles.
Do not archive security evidence, released migration instructions, incident
records, or ADRs; those remain discoverable with status links.

1. Confirm the replacement or reason and search inbound links.
2. Move the file under `docs/archive/<year>/` without rewriting its history.
3. Add an archive banner with date, reason, replacement, and last supported
   release; update inbound links and navigation.
4. Keep archives out of the default portal navigation but available by URL and
   repository search.
5. Delete only if content is sensitive, legally required to be removed, or
   wholly generated and reproducible. Record the deletion decision.

Review archives at each major release. Archived guidance is never an operating
instruction.
