# Build context is the repo root — the workspace packages are part of the build.
FROM node:22-alpine AS build
WORKDIR /src
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY scripts ./scripts
COPY packages ./packages
COPY apps/web-admin-roles ./apps/web-admin-roles

RUN pnpm install --frozen-lockfile  && pnpm contracts  && pnpm --filter web-admin-roles build

FROM nginx:alpine
COPY apps/web-admin-roles/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/apps/web-admin-roles/dist /usr/share/nginx/html
EXPOSE 80
