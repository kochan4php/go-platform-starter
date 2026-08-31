#!/usr/bin/env node
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("..", import.meta.url));
const directory = join(root, "docs", "assets", ".video");
mkdirSync(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: directory, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
await page.setContent(`<!doctype html><style>
body{margin:0;background:#09090b;color:#f4f4f5;font:24px/1.6 ui-monospace,monospace;display:grid;place-items:center;height:100vh}
main{width:1040px;border:1px solid #3f3f46;border-radius:16px;padding:36px;background:#18181b;box-shadow:0 24px 80px #0008}
h1{font:700 34px system-ui;margin:0 0 24px;color:#a5b4fc}.prompt{color:#86efac}.dim{color:#a1a1aa}#line{white-space:pre-wrap}
</style><main><h1>go-platform-starter · quickstart</h1><div id="line"></div></main><script>
const steps=[
  '<span class="prompt">$</span> git clone https://github.com/kochan4php/go-platform-starter.git',
  '<span class="prompt">$</span> cd go-platform-starter',
  '<span class="prompt">$</span> ./scripts/deploy-lab.sh',
  '<span class="dim">✓ postgres · redis · auth · users · rbac · worker · realtime · gateway</span>',
  '<span class="dim">✓ app: http://127.0.0.1:5173</span>',
  '<span class="dim">✓ API docs: http://127.0.0.1:8010/docs</span>'
]; let i=0; const el=document.querySelector('#line');
const next=()=>{if(i<steps.length){el.innerHTML+=(i?'\\n':'')+steps[i++];setTimeout(next,900)}};next();
</script>`);
await page.waitForTimeout(7000);
const video = page.video();
await page.close();
await context.close();
await browser.close();
const destination = join(root, "docs", "assets", "quickstart.webm");
rmSync(destination, { force: true });
renameSync(await video.path(), destination);
rmSync(directory, { recursive: true, force: true });
console.log("recorded docs/assets/quickstart.webm");
