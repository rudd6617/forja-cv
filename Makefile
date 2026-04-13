.PHONY: help init dev build test lint deploy migrate migrate-prod
.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-z][-a-z]+:.*##' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  make %-14s %s\n", $$1, $$2}'

init: ## Install dependencies
	npm install

dev: ## Start dev server
	npx vite build && npx wrangler dev --ip 0.0.0.0

build: ## Build for production
	npx tsc -b && npx vite build

test: ## Run tests
	npx vitest run

lint: ## Lint and typecheck
	npx eslint . && npx tsc --noEmit

deploy: ## Deploy to Cloudflare
	npx wrangler deploy

migrate: ## Run D1 migrations (local)
	npx wrangler d1 migrations apply cv-rabbit-db --local

migrate-prod: ## Run D1 migrations (production)
	npx wrangler d1 migrations apply cv-rabbit-db --remote
