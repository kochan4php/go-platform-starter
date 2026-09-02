# Root orchestrator for the Go monorepo. Windows users run these targets from Git Bash.

GO      ?= go
SVC     ?= _template
NAME    ?=
OP      ?=
PID     ?=
PNPM    ?= corepack pnpm

.DEFAULT_GOAL := help

.PHONY: help upgrade tidy fmt lint vet build test cover run dev contracts env clean hooks dev-test open open-docs seed seed-reset new-service new-migration new-handler db-shell logs psql redis-cli check-env test-watch web-test-watch db-diagram https delve

help: ## Show this help
	@grep -E '^[a-zA-Z_.-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*## "} {printf "  \\033[36m%-16s\\033[0m %s\\n", $$1, $$2}'

upgrade: ## Upgrade all Go dependencies, then tidy
	$(GO) get -u ./...
	$(GO) mod tidy
	@echo "dependencies upgraded — run 'make test' before committing"

tidy: ## Run go mod tidy
	$(GO) mod tidy

fmt: ## Format Go (gofumpt when installed, otherwise gofmt)
	@if command -v gofumpt >/dev/null 2>&1; then gofumpt -l -w .; else $(GO) fmt ./...; fi

lint: ## Run golangci-lint when installed, otherwise go vet
	@if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run; else $(GO) vet ./...; fi

vet: ## Run go vet
	$(GO) vet ./...

build: ## Compile all packages
	$(GO) build ./...

test: ## Run all tests (container tests skip when Docker is down)
	$(GO) test -count=1 ./...

cover: ## Print coverage summary
	$(GO) test -coverprofile=coverage.out ./... && $(GO) tool cover -func=coverage.out | tail -1

run: ## Run a service: make run SVC=auth
	APP_ENV_FILE=services/$(SVC)/.env $(GO) run ./services/$(SVC)

dev: ## Hot-reload a service from its committed Air config
	@if command -v air >/dev/null 2>&1; then air -c services/$(SVC)/.air.toml; else echo "(air not installed — falling back to plain run)"; $(MAKE) run SVC=$(SVC); fi

contracts: ## Regenerate a service stub: make contracts SVC=auth
	$(GO) tool oapi-codegen -config services/$(SVC)/codegen.cfg.yaml services/$(SVC)/openapi.yaml

env: ## Create a local env file from its example
	@test -f services/$(SVC)/.env && echo "services/$(SVC)/.env already exists (left untouched)" || cp services/$(SVC)/.env.example services/$(SVC)/.env
	@test -f services/$(SVC)/.env && echo "edit services/$(SVC)/.env as needed"

hooks: ## Install Husky pre-commit and commit-msg hooks
	$(PNPM) exec husky

dev-test: ## Run deterministic pre-push gates
	$(GO) test ./...
	$(GO) vet ./...
	$(PNPM) lint
	$(PNPM) test
	$(PNPM) test:contracts
	$(PNPM) check:devx

open: ## Open shell, aggregate API docs, and gateway health
	node scripts/devx.mjs open

open-docs: ## Serve direct per-service Scalar docs and dev entry index
	node scripts/devx.mjs open-docs

seed: ## Add 20 deterministic realistic lab users
	node scripts/devx.mjs seed

seed-reset: ## Wipe application rows in the named lab stack and reseed
	node scripts/devx.mjs seed-reset

new-service: ## Generate service: make new-service NAME=audit
	node scripts/devx.mjs new-service "$(NAME)"

new-migration: ## Generate pair: make new-migration SVC=users NAME=add_flag
	node scripts/devx.mjs new-migration "$(SVC)" "$(NAME)"

new-handler: ## Generate operation skeleton: make new-handler SVC=users OP=listUsers
	node scripts/devx.mjs new-handler "$(SVC)" "$(OP)"

db-shell: ## Open service-scoped psql: make db-shell SVC=users
	node scripts/devx.mjs db-shell "$(SVC)"

logs: ## Follow lab logs: make logs SVC=auth
	node scripts/devx.mjs logs "$(SVC)"

psql: ## Open the lab PostgreSQL shell
	node scripts/devx.mjs psql

redis-cli: ## Open the lab Redis CLI
	node scripts/devx.mjs redis-cli

check-env: ## Validate env examples against required Go env tags
	node scripts/check-devx.mjs

test-watch: ## Re-run Go tests when Go files change
	node scripts/devx.mjs test-watch

web-test-watch: ## Run every frontend test watcher
	$(PNPM) test:web:watch

db-diagram: ## Regenerate schema docs and DBML from migrations
	$(GO) run ./cmd/dbdocs

https: ## Start local development with mkcert TLS
	node scripts/devx.mjs https

delve: ## Attach Delve: make delve PID=1234
	node scripts/devx.mjs delve "$(PID)"

clean: ## Remove build/test artifacts
	$(GO) clean -cache -testcache
	rm -rf tmp coverage.out
