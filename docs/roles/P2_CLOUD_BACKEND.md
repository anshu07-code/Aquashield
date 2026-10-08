# P2 — CLOUD & BACKEND LEAD (owns "Built on AWS" + execution + the shared deployed stack)
Folders: `services/api/`, `services/ingest/`, `infra/`. Also merges contract PRs (with team lead).

## Start every AI session with
> Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md and docs/roles/P2_CLOUD_BACKEND.md. I am P2. Own infra/template.yaml (AWS SAM), services/api and services/ingest. Validate every request/response with zod schemas from @jalrakshak/types, import risk logic from @jalrakshak/risk-core. Model IDs come from env vars. Tell me exactly which AWS console steps I must do manually.

## Build order
1. **Skeleton in first 90 min:** `infra/template.yaml` (SAM): HTTP API, Lambda (Node 22 TS via esbuild), DynamoDB tables (Zones, RiskSnapshots[TTL 48h], Reports[TTL 6h], WorkOrders, Alerts), private S3 bucket (CORS, lifecycle 7d), SNS topic, EventBridge Scheduler rule (15 min -> ingest). Deploy `/health` and `/zones` returning `mocks/zones.json`. **Share the base URL with the team immediately.**
2. **Seed script:** load `data/zones.geojson` (from P4) into `Zones`. Until it exists, seed 4 mock zones.
3. **Ingest Lambda (`services/ingest`):** for every zone fetch Open-Meteo (minutely_15/hourly precipitation + past 24h), store forecast, compute risk with `risk-core` (+ active reports), write `RiskSnapshots`. Cache last good forecast; on failure reuse cache and set `stale=true`.
4. **API Lambdas:** `GET /zones`, `GET /zones/{id}`, `POST /reports/presign`, `POST /reports` (calls P3's vision module + trust, recomputes risk), `GET /reports`, `POST /route` (calls P4's route module), `/workorders`, `/alerts/{id}/publish` (SNS).
5. **Security:** least-privilege IAM per function, zod validation, upload size/type limits, API throttling, CORS limited to the Amplify domain, ops passcode header check (`OPS_PASSCODE` via SSM/env), rate limit on `/reports`.
6. **Amplify Hosting** for `apps/web` with env vars. Fallback: Next static export to S3 + CloudFront.
7. **Observability:** structured JSON logs, CloudWatch dashboard (invocations, errors, latency), AWS Budgets.
8. **Docs:** architecture diagram `docs/architecture.png` + `docs/ARCHITECTURE.md` polish; README "AWS services" table.
9. **AWS proof clips for the video (mandatory):** 6-8 clean 3-5 s screen recordings: Lambda function list/invocation, DynamoDB items, S3 object, Bedrock invocation (CloudWatch log or console), EventBridge rule firing, SNS publish, Amplify deployment, CloudWatch dashboard. Judges must SEE AWS.

## Rules
Everything via `sam build && sam deploy` (reproducible from a clean account). Consistent error JSON. No secrets in git.
Deploy after every merged PR so the team always tests against the latest stack. Redeploy before each checkpoint.

## Done when
A fresh `sam deploy` recreates everything; the public URL works end to end; the CloudWatch dashboard shows live traffic.

## Also owns
Architecture diagram, README polish, final submission form + checks (with team lead).
