# ARCHITECTURE

```
 Citizen PWA (Next.js on Amplify)            Ops Dashboard (/ops, same app)
        │                                            │
        └──────────────► API Gateway (HTTP API) ◄────┘
                              │
   ┌──────────┬───────────────┼────────────────┬───────────────┐
   ▼          ▼               ▼                ▼               ▼
 zones     reports          route           agent (Py,      workorders/alerts
 Lambda    Lambda           Lambda          Strands)        Lambda
   │        │  │              │              │ tools call        │
   │        │  └► S3 (photos) │              ▼ our API         SNS
   │        └────► Bedrock    │         Amazon Bedrock
   │             (vision)     │
   ▼                          ▼
   DynamoDB: Zones · RiskSnapshots(TTL) · Reports(TTL) · WorkOrders · Alerts
        ▲
        │
 EventBridge Scheduler (15 min) ─► ingest Lambda ─► Open-Meteo ─► risk-core ─► snapshots
```

## Data flow: citizen report
1. Browser asks `/reports/presign`, PUTs photo to S3.
2. `POST /reports` -> Lambda reads image -> Bedrock vision -> `VisionAnalysis` -> trust score -> store (TTL 6h).
3. Lambda recomputes the zone's risk with `risk-core` -> returns old and new risk.

## Data flow: forecast
EventBridge every 15 min -> ingest Lambda -> Open-Meteo per zone -> risk-core -> `RiskSnapshots`. UI reads snapshots.
If Open-Meteo fails the last good forecast is reused and `stale=true`.

## Data flow: agent
`POST /agent/ask` -> Strands agent (Bedrock) calls tools (zone risk, forecast, reports, route, work orders, alerts) -> validated `AgentPlan`.

## Why serverless
Costs ~nothing in dry weeks (scale to zero), scales automatically during a storm. DynamoDB TTL keeps data fresh without cleanup jobs.

## AWS services
Lambda, API Gateway, DynamoDB, S3, EventBridge Scheduler, Bedrock, SNS, Amplify Hosting, CloudWatch, (optional) Amazon Location Service.
Open source: Strands Agents SDK, AWS SAM CLI.

## Failure modes and fallbacks
| Failure | Fallback |
|---|---|
| Open-Meteo down | cached forecast, `stale` badge |
| Bedrock error/timeouts | report saved as `needs_review`, half trust |
| Routing provider down | OSRM fallback, then precomputed demo route (disclosed) |
| Amplify SSR trouble | static export on S3 + CloudFront |
