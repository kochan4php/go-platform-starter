---
type: "query"
date: "2026-08-31T07:55:20.322499+00:00"
question: "periksa deploy.yml dari .github/workflows, terdapat warning ini Context access might be invalid: UAT_URL"
contributor: "graphify"
outcome: "useful"
source_nodes: [".github/workflows/deploy.yml", "deploy.sh", "CI Workflow"]
---

# Q: periksa deploy.yml dari .github/workflows, terdapat warning ini Context access might be invalid: UAT_URL

## Answer

Expanded from graph vocabulary: [deploy, workflow, variables, uat, drift, matrix]. Direct vars.UAT_URL, vars.DEMO_URL, and vars.PROD_URL access is valid only when repository variables exist, but static tooling cannot resolve those undeclared property names. The drift matrix now carries url_variable keys and resolves vars[matrix.url_variable] at step runtime; CI_CD.md documents all three repository variables. actionlint, YAML parsing, config checks, and diff checks pass.

## Outcome

- Signal: useful

## Source Nodes

- .github/workflows/deploy.yml
- deploy.sh
- CI Workflow