# Root orchestrator for the Go monorepo.
# Windows note: run from git-bash; every target is plain commands you can run directly.

GO      ?= go
SVC     ?= auth
LATEST  := @latest

.DEFAULT_GOAL := help

.PHONY: help upgrade tidy build vet test cover lint fmt run legacy.test legacy.up contracts clean

help: ## Show this help
	@grep -E '^[a-zA-Z_.-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*## "} {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

upgrade: ## Upgrade ALL Go dependencies to their latest versions, then tidy
	$(GO) get -u ./...
	$(GO) mod tidy
	@echo "dependencies upgraded — run 'make test' before committing"

tidy: ## go mod tidy
	$(GO) mod tidy

build: ## Compile all packages
	$(GO) build ./...

vet: ## go vet ./...
	$(GO) vet ./...

test: ## Run all tests with race detector
	$(GO) test -race -count=1 ./...

cover: ## Coverage report
	$(GO) test -coverprofile=coverage.out ./... && $(GO) tool cover -func=coverage.out | tail -1

fmt: ## gofumpt if available, else gofmt
	@if command -v gofumpt >/dev/null; then gofumpt -l -w .; else $(GO) fmt ./...; fi

lint: ## golangci-lint if available, else go vet
	@if command -v golangci-lint >/dev/null; then golangci-lint run; else $(GO) vet ./...; fi

run: ## Run a service: make run SVC=auth
	$(GO) run ./services/$(SVC)

legacy.test: ## Run the frozen TypeScript acceptance suite
	cd legacy && pnpm test

legacy.up: ## Upgrade legacy TS deps to latest
	cd legacy && pnpm update --latest

contracts: ## Generate server stubs from a service spec: make contracts SVC=auth
	$(GO) run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen$(LATEST) \
		-config services/$(SVC)/codegen.cfg.yaml services/$(SVC)/openapi.yaml

clean: ## Remove build/test artifacts
	$(GO) clean -cache -testcache
	rm -f coverage.out
