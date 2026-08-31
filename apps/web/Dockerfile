# Build context is the repo root — the workspace packages are part of the build.
FROM node:22-alpine AS build
WORKDIR /src
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm fetch --frozen-lockfile

COPY scripts ./scripts
COPY packages ./packages
COPY apps/web ./apps/web
# aggregate spec composes from every service's openapi.yaml
COPY services ./services

RUN --mount=type=cache,target=/root/.local/share/pnpm/store,sharing=locked \
    pnpm install --offline --frozen-lockfile \
 && pnpm contracts \
 && pnpm --filter web build

FROM nginxinc/nginx-unprivileged:alpine
ENV NGINX_GZIP_LEVEL=5
COPY apps/web/nginx.conf /etc/nginx/templates/default.conf.template
COPY --chmod=755 apps/web/config-entrypoint.sh /docker-entrypoint.d/40-config.sh
COPY --chown=101:101 --from=build /src/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/
