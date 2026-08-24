# syntax=docker/dockerfile:1

FROM node:lts-alpine AS base
RUN corepack enable

# Production-only dependencies (includes bcrypt native build tools)
FROM base AS deps-prod
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build stage
FROM base AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runner
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
RUN chown -R node:node /app
USER node
EXPOSE 8000
# Apply migrations, then boot
CMD ["sh", "-c", "node dist/database/scripts/db.js up && node dist/server.js"]
