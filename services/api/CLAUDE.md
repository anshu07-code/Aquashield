# P2 — CLOUD & BACKEND LEAD

**Owner:** P2  
**Paths:** `services/api/`, `services/ingest/`, `infra/`

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md, docs/SYNCHRONIZATION.md, and this file first.
You are P2. Work in services/api/, services/ingest/, and infra/. Validate everything against @jalrakshak/types.
```

## What you're building
- AWS SAM infrastructure (template.yaml)
- TypeScript Lambda functions for all API endpoints
- EventBridge Scheduler → Lambda ingest pipeline
- DynamoDB tables, S3 bucket, SNS topic
- Amplify Hosting setup

## Critical rules

### NEVER do these
- ❌ Don't hard-code Bedrock model IDs — use `process.env.BEDROCK_MODEL_ID`
- ❌ Don't commit secrets, keys, `.env`, or `samconfig.toml`
- ❌ Don't change `packages/types/src/index.ts` without announcing in chat first
- ❌ Don't skip zod validation on incoming requests or outgoing responses
- ❌ Don't call Overpass or Open-Meteo from the browser (only from ingest Lambda)

### ALWAYS do these
- ✅ Every Lambda response must match the zod schema in `packages/types`
- ✅ Import risk logic from `@jalrakshak/risk-core` (never re-implement)
- ✅ Consistent error JSON: `{ error: { code: "ERROR_CODE", message: "..." } }`
- ✅ Structured JSON logs for CloudWatch
- ✅ Deploy after every merge so team always has latest stack

## First 90 minutes: DEPLOY THE STUB
1. Create `infra/template.yaml` (SAM): HTTP API, one Lambda returning `mocks/zones.json`
2. `sam build && sam deploy --guided` (first time)
3. Share the base URL with the team in chat IMMEDIATELY
4. P1 is blocked until this exists

## Build order
1. **Stub API** (90 min): HTTP API + Lambda + `/health` + `/zones` returning `mocks/zones.json`
2. **DynamoDB tables** (30 min): Zones, RiskSnapshots (TTL 48h), Reports (TTL 6h), WorkOrders, Alerts
3. **S3 bucket** (15 min): private, CORS, lifecycle 7d, presigned PUT/GET
4. **Seed script** (30 min): load `data/zones.geojson` or stub 4 zones into `Zones` table
5. **Ingest Lambda** (2h): EventBridge every 15min → Open-Meteo → risk-core → RiskSnapshots
6. **API Lambdas** (3h): /zones, /zones/{id}, /reports/presign, /reports, /route, /workorders, /alerts
7. **Vision integration** (ask P3 for `services/api/src/vision/index.ts`, call from reports Lambda)
8. **Amplify Hosting** (1h): connect `apps/web`, set env vars, deploy
9. **CloudWatch dashboard** (30 min): invocations, errors, latency per function

## Verify before push
```bash
npm run verify:p2
sam validate -t infra/template.yaml  # also validate SAM template
```

## AWS console steps (manual, not in SAM)
1. Enable MFA on root account
2. Create IAM users for each team member
3. Request Bedrock model access (Claude multimodal)
4. Create AWS Budget alerts at $5/$20/$50
5. Enable CloudWatch Contributor Insights (optional)

## If you're blocked
- P3 waiting for vision module? Create a stub: `services/api/src/vision/index.ts` that returns mock VisionAnalysis
- P4 waiting for zone seeding? Use the 4 mock zones in DynamoDB for now
- Amplify fighting you? Fall back to `next export` → S3 + CloudFront

## Shared tasks
- Architecture diagram `docs/architecture.png`
- README "AWS services" section
- AWS proof clips for demo video (6-8 clean 3-5s screen recordings)
- Final submission form + checks