#!/usr/bin/env node
const [status, environment, revision] = process.argv.slice(2);
const url = process.env.DEPLOY_WEBHOOK_URL;
if (!url) process.exit(0);
const message = `go-platform-starter deploy ${status}: ${environment} @ ${revision}`;
const response = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ text: message, content: message }),
});
if (!response.ok) throw new Error(`deploy notification failed: HTTP ${response.status}`);
