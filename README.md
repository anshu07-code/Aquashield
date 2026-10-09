# Aquashield
**Hyperlocal flood intelligence for Delhi's underpasses. Predict it. Verify it. Route around it. Act on it.**

> Hackathon: WeMakeDevs x AWS Environmental Hacks (Bharat Builds Tour #02) · Track: Heat and Water · Oct 8-11, 2026

<!-- Replace the TODOs as you build. Judges read this. Keep it honest. -->

## Problem
TODO (2-3 sentences, sourced). Underpass waterlogging in Delhi traps commuters; warnings are late and not street-level.

## Solution
TODO: what Aquashield does, for whom (commuters + city ops).

## Live demo
- App: TODO (Amplify URL)
- Video: TODO (YouTube link)

## How it works
Detect -> Verify -> Predict -> Explain -> Act
1. **Detect:** live Open-Meteo forecast + citizen photo reports.
2. **Verify:** Amazon Bedrock vision triage + trust score (corroboration, rain consistency, time decay).
3. **Predict:** explainable Flood Risk Index (0-100) + ETA to critical.
4. **Explain:** factor breakdown; AI agent explains why.
5. **Act:** safe-route navigation, bilingual alerts, work orders for the city.

## Architecture
TODO: embed `docs/architecture.png`. See `docs/ARCHITECTURE.md`.

## AWS services used
| Service | Why |
|---|---|
| Lambda + API Gateway | serverless API, scale-to-zero |
| DynamoDB (TTL) | zones, risk snapshots, auto-expiring reports |
| S3 | citizen photos via presigned upload |
| EventBridge Scheduler | 15-minute forecast ingestion |
| Amazon Bedrock | image triage + agent reasoning |
| SNS | alert publishing |
| Amplify Hosting | frontend |
| CloudWatch | logs and dashboard |
| **Open source:** Strands Agents SDK, AWS SAM CLI | agent framework, IaC |

## Risk engine
Explainable weighted index, not a probability. See `docs/RISK_ENGINE.md`. Tests: `npm test`.

## AI agent
TODO: tools, guardrails (human-in-the-loop), example output.

## Evaluation
TODO: vision accuracy on our labelled image set (n=__), confusion matrix, limitations.

## Data sources & licences
TODO: Open-Meteo, OpenStreetMap contributors (ODbL), public waterlogging sources (see `data/SOURCES.md`), image credits.

Frontend (`apps/web`) — already in use, all open source:
| Component | Licence |
|---|---|
| [MapLibre GL JS](https://maplibre.org/) | BSD-3-Clause |
| [Next.js](https://nextjs.org/) / React | MIT |
| [Tailwind CSS](https://tailwindcss.com/) | MIT |
| [zod](https://zod.dev/) | MIT |
| CARTO dark basemap tiles | © [CARTO](https://carto.com/) © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL) — shown in the map attribution control |
| Fonts: Inter, Space Grotesk, Noto Sans Devanagari (next/font) | SIL Open Font License 1.1 |
| UI icons | hand-written inline SVG (no third-party icon set) |

## Impact
TODO: only sourced or clearly-labelled claims.

## Limitations & future scope
TODO: honest limits (coarse DEM, seeded history, small eval set). Future: real IMD/municipal data, WhatsApp alerts.

## AI coding tools used
TODO: list every AI tool the team used.

## Team
TODO: names + GitHub handles.

## Run locally
```bash
npm install
npm test
cp .env.example .env.local
# see docs/roles/ for per-folder commands
```

Frontend (citizen PWA + ops dashboard):
```bash
npm run mock:api          # mock backend on :3001 (no AWS needed)
cd apps/web && npm run dev   # app on :3000
```
Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_USE_MOCKS=false` in `apps/web/.env.local` to hit the real API instead.
