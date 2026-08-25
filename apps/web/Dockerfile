# Build context is the repo root — the workspace packages are part of the build.
FROM node:22-alpine AS build
WORKDIR /src
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY scripts ./scripts
COPY packages ./packages
COPY apps/web ./apps/web
# aggregate spec composes from every service's openapi.yaml
COPY services ./services

RUN pnpm install --frozen-lockfile \
 && pnpm contracts \
 && pnpm --filter web build

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/config-entrypoint.sh /docker-entrypoint.d/40-config.sh
RUN chmod +x /docker-entrypoint.d/40-config.sh
COPY --from=build /src/apps/web/dist /usr/share/nginx/html
EXPOSE 80
