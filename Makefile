# Root orchestrator for the Go monorepo. Windows note: run from git-bash;
# every target is plain commands you can run directly.

GO      ?= go
SVC     ?= _template

.DEFAULT_GOAL := help

.PHONY: help upgrade tidy fmt lint vet build test cover run dev contracts env clean

help: ## Show this help
	@grep -E '^[a-zA-Z_.-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*## "} {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

upgrade: ## Upgrade ALL Go dependencies, then tidy
	$(GO) get -u ./...
	$(GO) mod tidy
	@echo "dependencies upgraded — run 'make test' before committing"

tidy: ## go mod tidy
	$(GO) mod tidy

fmt: ## Format (gofumpt if available, else gofmt)
	@if command -v gofumpt >/dev/null 2>&1; then gofumpt -l -w .; else $(GO) fmt ./...; fi

lint: ## golangci-lint when installed, else go vet
	@if command -v golangci-lint >/dev/null 2>&1; then golangci-lint run; else $(GO) vet ./...; fi

vet: ## go vet ./...
	$(GO) vet ./...

build: ## Compile all packages
	$(GO) build ./...

test: ## Run all tests (container tests auto-skip when Docker is down)
	$(GO) test -count=1 ./...

cover: ## Coverage summary
	$(GO) test -coverprofile=coverage.out ./... && $(GO) tool cover -func=coverage.out | tail -1

run: ## Run a service: make run SVC=_template
	APP_ENV_FILE=services/$(SVC)/.env $(GO) run ./services/$(SVC)

dev: ## Hot-reload a service (uses air when installed, falls back to run)
	@mkdir -p tmp
	@printf 'root = "."\nbinary = "tmp/bin-$(SVC)"\ncmd = "go build -o tmp/bin-$(SVC) ./services/$(SVC) && APP_ENV_FILE=services/$(SVC)/.env tmp/bin-$(SVC)"\ninclude_ext = ["go", "sql", "yaml", "env"]\nexclude_dir = ["legacy", "tmp", "node_modules"]\ndelay = 300\n' > tmp/air-$(SVC).toml
	@if command -v air >/dev/null 2>&1; then air -c tmp/air-$(SVC).toml; else echo "(air not installed — falling back to plain run)"; $(MAKE) run SVC=$(SVC); fi

contracts: ## Regenerate stubs from a service spec: make contracts SVC=_template
	$(GO) tool oapi-codegen -config services/$(SVC)/codegen.cfg.yaml services/$(SVC)/openapi.yaml

env: ## Create local env file from example: make env SVC=_template
	@test -f services/$(SVC)/.env && echo "services/$(SVC)/.env already exists (left untouched)" || cp services/$(SVC)/.env.example services/$(SVC)/.env
	@test -f services/$(SVC)/.env && echo "edit services/$(SVC)/.env as needed"

clean: ## Remove build/test artifacts
	$(GO) clean -cache -testcache
	rm -rf tmp coverage.out
