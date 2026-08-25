# Build context is the repo root — the workspace packages are part of the build.
FROM node:22-alpine AS build
WORKDIR /src
RUN corepack enable

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY scripts ./scripts
COPY packages ./packages
COPY apps/web-admin-users ./apps/web-admin-users
# aggregate spec composes from every service's openapi.yaml
COPY services ./services

# Production edge serves this remote under a subpath; bake it into the build.
ARG REMOTE_BASE=/
ENV REMOTE_BASE=${REMOTE_BASE}

# Cache the pnpm store across builds: manifest changes no longer re-download
# the whole dependency tree over slow links.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store     pnpm install --frozen-lockfile  && pnpm contracts  && pnpm --filter web-admin-users build

FROM nginx:alpine
COPY apps/web-admin-users/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/apps/web-admin-users/dist /usr/share/nginx/html
EXPOSE 80
