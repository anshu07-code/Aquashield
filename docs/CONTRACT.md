# API CONTRACT

**Source of truth: `packages/types/src/index.ts` (zod). This file is the human-readable summary.**
Mock responses in `mocks/*.json` are validated against the schemas by `npm test`.
Change process: small PR touching types + mocks + this file, announced in chat first.

Base URL: `${NEXT_PUBLIC_API_URL}` (P2 shares it). All responses JSON. Errors: `{ "error": { "code", "message" } }`.
Mock coordinates/names in `mocks/` are placeholders; P4 replaces them with verified real zones.

| Method | Path | Request | Response schema | Mock |
|---|---|---|---|---|
| GET | `/health` | - | `{ ok: true, time }` | - |
| GET | `/zones` | - | `ZoneListResponse` | `mocks/zones.json` |
| GET | `/zones/{id}` | - | `ZoneDetail` | `mocks/zone-detail.json` |
| POST | `/reports/presign` | `PresignRequest` | `PresignResponse` | - |
| POST | `/reports` | `CreateReportRequest` | `CreateReportResponse` | `mocks/report-response.json` |
| GET | `/reports?zoneId=` | - | `{ reports: Report[] }` | - |
| GET | `/reports?zoneId=&status=resolved` | - | `{ reports: Report[] }` (only resolved) | - |
| PATCH | `/reports/{zoneId}/{id}` | - | `ResolveReportResponse` `{ report: Report }` | - |
| POST | `/route` | `RouteRequest` | `RouteResponse` | `mocks/route-response.json` |
| POST | `/agent/ask` | `AgentAskRequest` | `AgentPlan` | `mocks/agent-plan.json` |
| GET | `/workorders` | - | `WorkOrderListResponse` | `mocks/workorders.json` |
| POST | `/workorders` | `CreateWorkOrderRequest` | `WorkOrder` | - |
| PATCH | `/workorders/{id}` | `WorkOrderPatch` | `WorkOrder` | - |
| POST | `/alerts` | `CreateAlertRequest` | `Alert` | - |
| POST | `/alerts/{id}/publish` | - | `Alert` | - |

Ops endpoints (`/workorders`, `/alerts/*`, `/agent/ask` with `execute=true`) require header `x-ops-passcode`.

## Semantics that everyone must agree on
- `risk`: integer 0-100. `tier`: SAFE <30, WATCH 30-54, HIGH 55-74, CRITICAL >=75.
- `etaMin`: `0` = already CRITICAL, `null` = not within next 3 hours, else minutes until CRITICAL.
- `stale`: true if the cached forecast is older than 45 minutes (UI shows a small "stale data" badge).
- `geometry`: array of `[lng, lat]` (GeoJSON order). Everywhere else use `lat`, `lng` fields.
- Reports expire after 6 hours (DynamoDB TTL). Only `verified` and `unverified` reports count for risk;
  `rejected` ones never do; `needs_review` count at half trust.
- Image upload: client calls `/reports/presign`, PUTs the file to `uploadUrl` with the same Content-Type, then POSTs `/reports` with `imageKey`.
  Max 5 MB; jpeg/png/webp only.
- `/reports` snaps to the nearest zone within 300 m if `zoneId` omitted; else 422 `NO_ZONE_NEARBY`.
- The rainfall simulator runs **client-side** with `@aquashield/risk-core`. It never calls the backend.
- Agent: `execute=false` returns a plan only. `execute=true` lets it create work orders / alert drafts; UI sets it only after a human click.
- Language: `lang` is `en` or `hi`. The agent always returns both `alertDraft.en` and `alertDraft.hi`.

## Error codes
`VALIDATION_ERROR` (400) · `UNAUTHORIZED` (401) · `NOT_FOUND` (404) · `NO_ZONE_NEARBY` (422) ·
`IMAGE_REJECTED` (422) · `RATE_LIMITED` (429) · `UPSTREAM_UNAVAILABLE` (503: Bedrock/Open-Meteo) · `INTERNAL` (500).

## Using the types
```ts
import { ZoneListResponseSchema, type ZoneSummary } from "@aquashield/types";
const data = ZoneListResponseSchema.parse(await res.json()); // fails loudly on drift
```
Backend: validate EVERY request with the matching schema and EVERY response before returning.
Frontend: in dev, parse responses with the schema so drift shows up immediately.
Python (agent): mirror `AgentPlan` as a Pydantic model; tests must compare it with `mocks/agent-plan.json`.

## DynamoDB tables (owned by P2)
- `Zones` pk `zoneId` (static attrs: lat, lng, isUnderpass, depressionDepthM, drainageDeficit, historyScore, criticalRainMmHr)
- `RiskSnapshots` pk `zoneId`, sk `ts`, TTL 48h (full `RiskBreakdown` + forecast + rain)
- `Reports` pk `zoneId`, sk `ts#id`, TTL 6h
- `WorkOrders` pk `id` · `Alerts` pk `id`
