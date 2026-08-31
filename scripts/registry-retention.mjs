#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const packageName = process.argv[2];
const apply = process.argv.includes("--apply");
const owner = process.env.GITHUB_REPOSITORY_OWNER;
if (!owner || !packageName) {
  console.error("usage: GITHUB_REPOSITORY_OWNER=owner registry-retention.mjs PACKAGE [--apply]");
  process.exit(2);
}
const ownerType = execFileSync("gh", ["api", `/users/${owner}`, "--jq", ".type"], {
  encoding: "utf8",
}).trim();
const scope = ownerType === "Organization" ? "orgs" : "users";
const endpoint = `/${scope}/${owner}/packages/container/${packageName}/versions`;
const pages = JSON.parse(
  execFileSync("gh", ["api", "--paginate", "--slurp", `${endpoint}?per_page=100`], { encoding: "utf8" }),
);
const versions = pages.flat();
const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
const candidates = versions
  .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  .slice(20)
  .filter((version) => {
    const tags = version.metadata?.container?.tags ?? [];
    return new Date(version.updated_at).getTime() < cutoff && tags.every((tag) => /^(?:sha-|pr-)/.test(tag));
  });
for (const version of candidates) {
  console.log(`${apply ? "deleting" : "would delete"} ${packageName}@${version.id}`);
  if (apply) execFileSync("gh", ["api", "--method", "DELETE", `${endpoint}/${version.id}`]);
}
