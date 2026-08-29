import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const servicesDir = join(root, "services");
const required = [
  ".env.example",
  "Dockerfile",
  "Jenkinsfile",
  "codegen.cfg.yaml",
  "openapi.yaml",
  "deploy/k8s/deployment.yaml",
  "deploy/k8s/hpa.yaml",
  "deploy/k8s/migrate-job.yaml",
  "deploy/k8s/secret.tpl.yaml",
  "deploy/k8s/service.yaml",
];

const contractServices = readdirSync(servicesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name !== "_template")
  .map((entry) => entry.name)
  .filter((name) => existsSync(join(servicesDir, name, "codegen.cfg.yaml")));

const missing = contractServices.flatMap((service) =>
  required
    .filter((file) => !existsSync(join(servicesDir, service, file)))
    .map((file) => `${service}/${file}`),
);
if (missing.length) {
  console.error(`service template drift detected:\n${missing.map((file) => `- ${file}`).join("\n")}`);
  process.exit(1);
}
console.log(`template drift check passed for ${contractServices.join(", ")}`);
