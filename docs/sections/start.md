---
title: Start
nav_order: 2
has_children: true
---

# Start

Clone to first merged pull request in about thirty minutes.

| Page | Read it when |
| --- | --- |
| [Onboarding](../ONBOARDING.md) | You are setting up the two toolchains and want the shortest path to a green `make dev-test`. |
| [Authentication UX](../AUTH_UX.md) | You are touching a login, registration, or password form and need the rules the UI must keep (paste is never blocked). |
| [FAQ](../FAQ.md) | You want to know why the repository is shaped the way it is — one module, one workspace. |
| [Troubleshooting](../TROUBLESHOOTING.md) | Something is broken and you want the smallest failing boundary rather than a guess. |
| [Glossary](../GLOSSARY.md) | A term in these docs or in the code is unfamiliar. |

## The shape of the repository

One Go module and one pnpm workspace. Six Go services sit behind a gateway; a
React module-federation shell hosts three remotes. PostgreSQL gives each service
its own schema, and Redis Streams carry everything that crosses a service
boundary.

If you read only one page after this one, read
[Architecture](../ARCHITECTURE.md).
