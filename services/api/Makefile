# Makefile for Aquashield Lambda deployment packages.
# All handlers are pre-built by `npm run build:lambdas`.
# SAM uses this to copy the bundles into the Lambda deployment package.
# No TypeScript compilation happens here — bundles are fully self-contained.

BUILD_DIR := ../.aws-sam/build

# Each target bundles one Lambda. The `build` recipe is intentionally empty —
# esbuild already ran locally via `npm run build:lambdas`. SAM just copies.
build-zones:
	@echo "Using pre-built zones bundle"

build-reports:
	@echo "Using pre-built reports bundle"

build-route:
	@echo "Using pre-built route bundle"

build-ops:
	@echo "Using pre-built ops bundle"

build-agent:
	@echo "Using pre-built agent bundle"

build-ingest:
	@echo "Using pre-built ingest bundle"

.PHONY: build-zones build-reports build-route build-ops build-agent build-ingest
