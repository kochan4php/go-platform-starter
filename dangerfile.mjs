// Danger strips the import and injects danger/fail/warn/markdown as globals
// before evaluating this file, so importing them is both unnecessary and an
// error: https://github.com/danger/danger-js/discussions/1153
/* global danger, fail, markdown, warn */

const files = [...danger.git.created_files, ...danger.git.modified_files, ...danger.git.deleted_files];
const changed = (pattern) => files.some((file) => pattern.test(file));

if (danger.github.pr.additions + danger.github.pr.deletions > 1800)
  warn("Large PR: consider splitting independent behavior.");
if (
  changed(/^services\/[^/]+\/migrations\/.*\.up\.sql$/) !==
  changed(/^services\/[^/]+\/migrations\/.*\.down\.sql$/)
)
  fail("Migrations require a matching up/down pair.");
if (changed(/^services\/[^/]+\/openapi\.yaml$/) && !changed(/^packages\/contracts\//))
  fail("OpenAPI changes must include regenerated contract artifacts.");
if (changed(/^(services|apps|packages)\//) && !changed(/^(CHANGELOG\.md|docs\/)/))
  warn("Runtime behavior changed without documentation or an Unreleased note.");
markdown(`DX review checked ${files.length} changed files.`);
