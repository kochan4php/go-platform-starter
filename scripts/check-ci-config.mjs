#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const required = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/preview.yml",
  ".github/workflows/release.yml",
  ".github/workflows/supply-chain.yml",
  ".github/workflows/nightly.yml",
  ".github/workflows/renovate.yml",
  "infra/k8s/base/kustomization.yaml",
  "infra/k8s/overlays/uat/kustomization.yaml",
  "infra/k8s/overlays/demo/kustomization.yaml",
  "infra/k8s/overlays/prod/kustomization.yaml",
  "scripts/check-deploy-config.sh",
  "scripts/deploy-prod.sh",
  "hooks/pre-receive",
  "docs/CI_CD.md",
  "version.txt",
];
const failures = required.filter((file) => !existsSync(file)).map((file) => `missing ${file}`);
const markers = {
  ".github/workflows/ci.yml": [
    "cancel-in-progress: true",
    "run-with-retry.mjs",
    "sticky-pull-request-comment",
    "test-reporter",
    "check-deploy-config.sh",
  ],
  ".github/workflows/deploy.yml": ["environment:", "promote.sh", "workflow_dispatch"],
  ".github/workflows/supply-chain.yml": [
    "cache-to: type=registry",
    "attest-build-provenance",
    "registry-retention.mjs",
  ],
  ".github/workflows/release.yml": ["release-please-action", "component-changelog.mjs", "release-candidate"],
};
for (const [file, expected] of Object.entries(markers)) {
  const content = existsSync(file) ? readFileSync(file, "utf8") : "";
  for (const marker of expected) if (!content.includes(marker)) failures.push(`${file}: missing ${marker}`);
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`CI/CD configuration OK: ${required.length} required artifacts`);
