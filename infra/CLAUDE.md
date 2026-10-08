# INFRA — AWS SAM TEMPLATE

**Owner:** P2  
**Path:** `infra/`

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/SYNCHRONIZATION.md, and this file first.
You are P2. This folder contains infra/template.yaml (AWS SAM).
```

## What you're building
`infra/template.yaml` — AWS SAM template defining:
- API Gateway HTTP API
- Lambda functions (Node 22 TypeScript via esbuild)
- DynamoDB tables (Zones, RiskSnapshots, Reports, WorkOrders, Alerts)
- S3 bucket (private, presigned only, CORS, 7d lifecycle)
- SNS topic for alerts
- EventBridge Scheduler rule (15 min → ingest Lambda)
- IAM roles with least privilege

## Rules
- ✅ `sam build && sam deploy` must recreate everything from a clean account
- ✅ Model IDs come from env vars, never hard-coded
- ✅ Secrets via SSM Parameter Store or env vars, not in template
- ❌ Don't commit `samconfig.toml` (add to .gitignore)
- ❌ Don't hard-code Bedrock model IDs

## Verify
```bash
sam validate -t infra/template.yaml
npm run verify:p2
```

## Deploy steps
```bash
sam build
sam deploy --guided   # first time (creates samconfig.toml)
sam deploy            # subsequent (uses samconfig.toml)
```