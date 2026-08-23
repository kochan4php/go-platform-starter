# syntax=docker/dockerfile:1

FROM node:lts-alpine AS base
RUN corepack enable

FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS dev
ENV NODE_ENV=development
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["pnpm", "run", "start:local:dev"]
