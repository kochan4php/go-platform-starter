---
type: "query"
date: "2026-08-31T07:48:15.812198+00:00"
question: "ada error ini di supply-chain,yml coy Unable to resolve action aquasecurity/trivy-action@0.28.0, repository or version not found"
contributor: "graphify"
outcome: "corrected"
source_nodes: ["CI: security (Trivy + Semgrep) job", "CI Workflow", ".github/workflows/supply-chain.yml"]
---

# Q: ada error ini di supply-chain,yml coy Unable to resolve action aquasecurity/trivy-action@0.28.0, repository or version not found

## Answer

Expanded from graph vocabulary: [trivy, action, supply, chain, workflow, vulnerability, scan]. The invalid unprefixed 0.28.0 reference appeared in CI and supply-chain workflows. Official aquasecurity/trivy-action metadata reports v0.36.0 as the current release, and its action.yaml preserves every used input. Replaced all three references with v0.36.0 and validated with actionlint and YAML parsing.

## Outcome

- Signal: corrected

## Source Nodes

- CI: security (Trivy + Semgrep) job
- CI Workflow
- .github/workflows/supply-chain.yml