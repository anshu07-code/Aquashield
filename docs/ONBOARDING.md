# JalRakshak — Team Onboarding Guide

> **Hackathon:** WeMakeDevs x AWS Environmental Hacks · Track: Heat and Water · Oct 8-11, 2026
> **Deadline:** NOT yet published. Check [wemakedevs.org/aws/env/schedule](https://www.wemakedevs.org/aws/env/schedule) + Discord.
> **Submit Sunday morning** — not at the wire.

---

## Before Anything Else — Your AI Agent's Session Start

Every time an AI agent (yours or teammates') starts a session, it should read in this order:

```
1. ROOT_CTX.md               ← hackathon context, coordination rules, ownership map
2. docs/ONBOARDING.md        ← this file, your role's instructions  
3. docs/SYNCHRONIZATION.md   ← git workflow, pre-push commands, blocking rules
4. docs/roles/P1_FRONTEND.md  (or P2/P3/P4 — your role file)
```

Then run:
```bash
git pull --rebase origin main
npm install
npm test     # must pass before starting
```

---

## Team Members & Roles

| | Person | What they own | Path |
|--|--------|---------------|------|
| P1 | Frontend & UX | Next.js PWA, risk map, report flow, ops dashboard | `apps/web/` |
| P2 | Cloud & Backend | AWS SAM, Lambda API, DynamoDB, S3, EventBridge, Amplify | `services/api/`, `services/ingest/`, `infra/` |
| P3 | AI Lead | Bedrock vision, trust score, Strands agent, bilingual alerts | `services/agent/`, `services/api/src/vision/` |
| P4 | Data & Risk | Risk engine, zone data, routing module, demo script | `packages/risk-core/`, `data/`, `services/api/src/route/` |
| All | Contract | Changes via tiny PR + chat | `packages/types/src/` |

**Need help in someone else's area?** Ask in chat or open a small PR. Never edit another person's folder silently.

---

## Setup — Do This Once Per Machine

```bash
# 1. Clone the repo (each member does this on their own machine)
git clone https://github.com/<team-lead-username>/jalrakshak.git
cd jalrakshak

# 2. Install all dependencies
npm install

# 3. Install the pre-push hook (one-time only)
npx tsx scripts/install-hooks.ts

# 4. Run tests — must pass before starting anything
npm test     # 9 risk-core tests + 6 mock validations ✅

# 5. Create your feature branch
git checkout -b p1/my-feature    # (replace p1 with your role: p2, p3, or p4)
```

---

## Commands to Run Before Every Push

### Everyone runs these (ALL 4 people):
```bash
git pull --rebase origin main
npm install
npm run validate:mocks
```

### Then run your role-specific check:
```bash
npm run verify:p1   # P1: type-checks apps/web
npm run verify:p2   # P2: validates mocks + SAM template
npm run verify:p3   # P3: type-checks AI modules
npm run verify:p4   # P4: runs risk-core tests (most critical)
```

### Or just run the full pre-push check:
```bash
npm run pre-push-check
```

**If any check fails → fix before pushing. Ask in team chat if unsure.**

---

## P1 — Frontend & UX Lead

**You own what judges SEE. Design & Usability + demo video quality depend on you.**

- Folder: `apps/web/`
- AI agent instructions: `apps/web/CLAUDE.md`
- Docs: `docs/roles/P1_FRONTEND.md`

### Start NOW — before AWS is ready (P2 takes 1-2 hours to deploy)

```bash
# Terminal 1 — start the mock API server
npm run mock:api
# Serves all endpoints from mocks/*.json at http://localhost:3001

# Terminal 2 — create Next.js app
npx create-next-app@latest apps/web --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd apps/web

# Add to apps/web/.env.local:
#   NEXT_PUBLIC_USE_MOCKS=true
#   NEXT_PUBLIC_API_URL=http://localhost:3001

# Install workspace deps
npm install @jalrakshak/types @jalrakshak/risk-core maplibre-gl
```

### Build in this order:
1. **Risk map** — MapLibre full-screen, zone markers coloured by tier (SAFE green / WATCH yellow / HIGH orange / CRITICAL red + pulse), legend, stale-data badge
2. **Zone detail panel** — bottom sheet (mobile) / side panel (desktop): risk %, tier, ETA, 6 factor bars with contribution %, top reasons, active reports with verified badge
3. **Rainfall simulator** — slider 0-100 mm/hr, calls `@jalrakshak/risk-core` in the browser. **SIMULATION** badge + reset button. Never re-implement the formula.
4. **3-tap report flow** — type → camera/upload → submit. Presign → PUT to S3 → POST `/reports`. Result card: AI analysis, confidence, trust, verified badge, old→new risk.
5. **Safe route** — origin (my location) + destination → 2-3 route cards → polylines on map → summary sentence ("Avoids 2 flooded underpasses · +6 min")
6. **Ops dashboard at /ops** — passcode gate, ranked hotspots, "Ask JalRakshak" box, plan card, work-order board
7. **PWA** — manifest.json, icons, service worker (offline cached zones), geolocation "risk near me"
8. **Polish** — skeleton loaders, error toasts, empty states, EN/HI toggle

### Demo path (protect above everything else):
```
map → click zone → rainfall simulator → report (3 taps) → safe route → ops ask AI
```

### Verify before push:
```bash
npm run verify:p1
```

---

## P2 — Cloud & Backend Lead

**You own "Built on AWS" — the judging criterion. Nothing is deployed until you deploy it.**

- Folders: `services/api/`, `services/ingest/`, `infra/`
- AI agent instructions: `services/api/CLAUDE.md`, `services/ingest/CLAUDE.md`
- Docs: `docs/roles/P2_CLOUD_BACKEND.md`

### Hour 1 — DEPLOY THE STUB (most urgent, blocks everyone)

```bash
# Install AWS SAM CLI
npm install -g aws-sam-cli

# Create infra/template.yaml with:
#   HTTP API → Lambda (Node 22 TypeScript) → returns mocks/zones.json

# Deploy
sam build
sam deploy --guided    # first time (creates samconfig.toml — DO NOT COMMIT THIS FILE)

# Share the deployed URL in team chat IMMEDIATELY
# e.g. https://abc123.execute-api.ap-south-1.amazonaws.com/prod
```

After URL is shared, everyone updates their `.env.local`:
```
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.region.amazonaws.com/prod
```

### Hour 2-3:
- DynamoDB tables: Zones, RiskSnapshots (TTL 48h), Reports (TTL 6h), WorkOrders, Alerts
- Private S3 bucket: CORS, presigned PUT/GET, 7-day lifecycle
- SNS topic for alerts
- Seed script: load `data/zones.geojson` or 4 mock zones into DynamoDB

### Hour 3-5:
- **Ingest Lambda** (`services/ingest/`): EventBridge Scheduler 15 min → Open-Meteo → `@jalrakshak/risk-core` → RiskSnapshots. On failure: reuse cached forecast + set `stale=true`
- **API Lambdas** for all endpoints from `docs/CONTRACT.md`

### Hour 5-8:
- Amplify Hosting for `apps/web` with env vars
- CloudWatch dashboard (invocations, errors, latency)
- AWS Budget alerts at $5/$20/$50

### AWS console (manual steps):
1. Enable MFA on root AWS account
2. Create IAM users for each team member
3. **Request Bedrock model access NOW** — can take hours to approve
4. Verify student enrollment at bit.ly/abc-verify

### Verify before push:
```bash
npm run verify:p2
sam validate -t infra/template.yaml
```

---

## P3 — AI Lead

**You own "the wow" — vision triage, trust score, AI agent, bilingual alerts.**

- Folders: `services/agent/`, `services/api/src/vision/`, `data/eval/`
- AI agent instructions: `services/agent/CLAUDE.md`
- Docs: `docs/roles/P3_AI.md`

### FIRST HOUR — prove Bedrock works NOW

```
Test one Bedrock multimodal call from Lambda in your chosen region.
If it fails → report to team chat IMMEDIATELY. This is the #1 hidden blocker.
```

### Build order:

1. **Vision triage module** (`services/api/src/vision/`):
   - Input: S3 image bytes → Bedrock multimodal → JSON only
   - Output must validate against `VisionAnalysisSchema` in `packages/types`
   - Retry once on malformed JSON, then `needs_review`
   - Reject non-road images (`isRoadScene=false` → status `rejected`)
   - Prompts in `services/api/src/vision/prompts/` with version comments
   - Target: <8 seconds

2. **Trust score function** (unit tests required):
   ```
   trust = visionConfidence × corroboration × rainConsistency × ageDecay
   ```

3. **Strands agent** (Python Lambda, `services/agent/`):
   - Tools: get_zone_risk, get_forecast, get_nearby_reports, get_nearby_zones, plan_safe_route, create_work_order, draft_alert, publish_alert
   - All tools call OUR API/DynamoDB, never guess numbers
   - `execute=false` → plan only. `execute=true` → may create work orders/alerts
   - Output validates against `AgentPlanSchema` in `packages/types`
   - Target: <20 seconds

4. **Bilingual alerts**: every plan includes `alertDraft.en` and `alertDraft.hi` (<160 chars each)

5. **Evaluation set** (`data/eval/`): 20-30 labelled images + accuracy script + confusion matrix for README

### Verify before push:
```bash
npm run verify:p3
```

---

## P4 — Data, Risk & Routing Lead

**You own "credibility" — risk engine, zone data, demo story.**

- Folders: `packages/risk-core/`, `data/`, `services/api/src/route/`, `docs/DEMO.md`
- AI agent instructions: `packages/risk-core/CLAUDE.md`
- Docs: `docs/roles/P4_DATA_RISK.md`

### Risk engine — already built ✅

```bash
npm test   # runs 9 tests — must always pass
```

**NEVER change weights/thresholds without a PR + announcement** — demo numbers depend on them.

### Build order:

**Today:**
1. **Verify risk-core** — run `npm test`, check tier boundaries, monotonicity, ETA edge cases
2. **Create data/zones.geojson** (10-15 Delhi underpasses minimum):
   - OSM Overpass query: `tunnel=yes OR layer=-1 on roads in Delhi` (use https://overpass-turbo.eu/)
   - Open-Meteo Elevation API → `depressionDepthM`
   - `drainageDeficit` 0-100 from drain proximity + built-up land share
   - `historyScore` 0-100 from cited public waterlogging reports
   - `criticalRainMmHr` (lower for underpasses)
3. Store all sources in `data/SOURCES.md`
4. Cache API responses in `data/cache/` (gitignored)

**Tomorrow:**
5. **Route module** (`services/api/src/route/`):
   - Amazon Location Service or OSRM `alternatives=true`
   - For each polyline: find zones within ~40m → score = durationMin + λ×Σ(hazardWeight)
   - Routes crossing CRITICAL zone are `unsafe` → never recommended
   - Output matches `RouteResponseSchema` in `packages/types`

6. **Demo scenario** (`docs/DEMO.md`):
   - Origin/destination where default route crosses a CRITICAL underpass
   - Exact coordinates + slider values documented

### Verify before push:
```bash
npm run verify:p4   # runs npm test (most critical check in the project)
```

---

## Milestone Timeline

| When | What |
|------|------|
| **Thu +1h** | All 4 registered + verified; repo created; AWS account started |
| **Thu +3h** | Stub API deployed (P2); P1's map shows zones on localhost |
| **Thu night** | Zones from real geojson; ingest Lambda running; P1 UI functional |
| **Fri midday** | Report flow end-to-end (photo → S3 → Bedrock → risk update) |
| **Fri night** | ALL P0 features working on deployed URL |
| **Sat 6 PM** | Feature freeze — no new features, bug fixes only |
| **Sun morning** | Video recorded + uploaded; README + writeup done; submitted |

---

## Critical Rules

1. **npm test must pass before every push** — run it now: `npm test`
2. **Small PRs** — one feature at a time, 2-3 merges per day minimum
3. **Deploy daily** — a deployed boring app beats a perfect local one
4. **Real data > simulated** — label anything seeded as "SIMULATION"
5. **AWS must appear in the demo video** — show Lambda console, DynamoDB, Bedrock
6. **Never invent numbers** — if you don't have data, say "no data yet"
7. **Demo path first** — if something isn't working by Sat 6 PM, cut it from the demo

## Key File Map

| File | What it is |
|------|-----------|
| `ROOT_CTX.md` | AI agent reads this first — context + ownership + coordination rules |
| `docs/ONBOARDING.md` | This file — full team guide |
| `docs/SYNCHRONIZATION.md` | Git workflow, blocking rules, per-person commands |
| `docs/ROLES_AI.md` | AI agent prompts for each role (quick-start) |
| `packages/types/src/index.ts` | API contract — source of truth, single place to change |
| `packages/risk-core/src/index.ts` | Risk formula — ONLY place it exists |
| `mocks/*.json` | Mock API responses — validated by npm test |
| `scripts/pre-push-check.ts` | Gates every git push |
| `scripts/mock-api-server.ts` | P1's local API (no AWS needed to start) |
| `STATUS.md` | What each person did — update every few hours |