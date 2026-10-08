> **Note:** This is the original planning playbook (full feature list P0/P1/P2, judging map, differentiators, stack rationale). If anything here conflicts with `AGENTS.md`, `docs/CONTRACT.md`, `docs/RISK_ENGINE.md` or the role files in `docs/roles/`, **those win** (e.g. the contract has 5 DynamoDB tables and refined schemas).

# Aquashield — Winning Playbook
**Environmental Hacks (Bharat Builds Tour, Event 02) · Track 02: Heat and Water · Oct 8–11, 2026**

> Tagline: **"Don't react to floods. Predict them, verify them, route around them, act on them."**

---

## 0. READ FIRST: facts from the official pages (fetched Oct 8, 2026)

| Item | What the organisers say |
|---|---|
| Dates | Thu Oct 8 Kickoff · Fri Oct 9 Build · Sat Oct 10 Delhi build day (DTU, 8 AM–8 PM, optional, limited seats, no score benefit) · Sun Oct 11 Submissions |
| **Hours / deadline** | **Not published yet.** The schedule page says the kickoff call, sessions and the exact deadline are "being finalised". Re-check the Schedule page and Discord every few hours. **Plan to submit by Sunday morning**, not at the deadline. |
| Team | 1–4 people. Every member registers individually with their own account. One submission per team. |
| Eligibility | Indian university students, 18+. Needs a WeMakeDevs account **and** an AWS Builder Center profile with enrollment verified (SheerID). |
| Prize | Track winner ₹2,00,000 + $2,000 AWS credits. 4 runners-up get $1,000 credits each. Top 5 blogs get AirPods. |
| **Amazon fast-track interview** | Top 10 projects across all 3 tracks. **Pre-Final (2028) and Final (2027) years are eligible** (you qualify). Winning a prize is *not* required and *not* enough. Your registration details and verified Builder Center profile are checked, so fix verification **today**. |
| Prize eligibility | Must use at least one AWS open-source tool **or** be deployed on AWS. **The demo video must show AWS.** Naming it in the writeup is not enough. |
| Submission = 3 things | (1) public GitHub repo, (2) YouTube demo video **under 3:00** (public or unlisted, test it signed out), (3) short writeup: problem, build, where AWS fits. List AI coding tools you used in the writeup. |
| Judging | Idea & Impact · Built on AWS · Design & Usability · Execution ("one feature that runs beats five that almost do") · Demo video. No live demo, no call. **If the video doesn't show it, it doesn't exist.** |
| Hard rules | Start building when the clock starts. Old projects are disqualified. **Repo history must match event dates** (first commit today or later). Anything you didn't write needs credit and a licence. |

**Integrity note (this protects your interview chance):** never present simulated/seeded data as real. Label it "simulation" on screen. Judges can disqualify for mismatch between claims and the repo, and panelists notice invented statistics. Use real sources or say nothing.

---

## 1. Hour-0 checklist (do now, in parallel, ~60 min)

- [ ] **All 4:** register for the tour, check in to Environmental Hacks, join the WeMakeDevs Discord and the Builder Center space.
- [ ] **All 4:** AWS Builder Center profile + student verification (SheerID). Start now; it can take time.
- [ ] **Team lead:** create the AWS account (debit/RuPay works, ~₹2 verification). New accounts get up to $200 credits. Enable MFA. Never use root for work.
- [ ] **Team lead:** create **AWS Budgets** alerts at $5 / $20 / $50.
- [ ] **Backend person:** open Bedrock console in your chosen region and **request model access immediately** (Claude Haiku/Sonnet class). Approval can lag. This is the #1 hidden blocker.
- [ ] **Team lead:** fill the $25 credits form only after the $200 is used (one form, leader only).
- [ ] **Team lead:** create the public GitHub repo and push an initial commit **today**. Add all 4 as collaborators.
- [ ] Decide the AI coding tools you'll use and note them for the writeup.
- [ ] Optional: apply for the DTU Saturday seat on Luma (mentor feedback is valuable, but online carries equal weight).

---

## 2. The product

**Aquashield** is a hyperlocal urban-flood early-warning and safe-routing system for Delhi. It combines live rainfall forecasts, terrain/drainage data, and AI-verified citizen reports to produce **street-level waterlogging risk**, then recommends actions to both commuters and the city.

**Why Delhi:** judges and organisers are in Delhi; underpass waterlogging there is well documented; DTU is the build-day venue. Make the city a config file (`city.config.json`) so it can be swapped.

**Pick ONE sharp hero problem: underpasses.** Underpasses are where vehicles get trapped and people die, and OSM tags them (`tunnel=yes` / `layer=-1`). "A small problem solved well beats a big one solved vaguely" is straight from the judging page. Frame it as: *"Delhi's flooded underpasses: know before you drive in."*

### Two audiences, one engine
1. **Citizens/commuters (PWA):** see risk map, get safe route, report flooding in 3 taps, receive alerts.
2. **City ops (dashboard):** ranked hotspots, AI action plans, work orders (pump dispatch, drain cleaning), alert drafts in English + Hindi.

### The killer loop (every demo second maps to this)
**Detect → Verify → Predict → Explain → Act**
- *Detect:* citizen photo + live forecast
- *Verify:* Bedrock vision + crowd corroboration (anti-fake)
- *Predict:* explainable risk index + ETA to critical
- *Explain:* factor bars + agent reasoning
- *Act:* safe route, alert, work order

---

## 3. What judges reward, and how we win each one

| Criterion | What a strong panel wants | Our answer |
|---|---|---|
| Idea & Impact | Real problem, clear beneficiary, narrow scope | Underpass flooding in Delhi; commuters + MCD/PWD ops; cite real sources only |
| Built on AWS | Substantive use, not logo-slapping | Lambda, API Gateway, DynamoDB (TTL), S3, EventBridge, Bedrock, SNS, Amplify, CloudWatch, plus **open-source: Strands Agents SDK + SAM CLI** |
| Design & Usability | A stranger can use it without a tutorial | Mobile-first PWA, 3-tap report, one-glance colours, Hindi/English, big touch targets |
| Execution | Works, end to end | Real forecast pipeline, real Bedrock calls, deployed URL, no dead buttons |
| Demo video | Clear, under 3 min, shows AWS | Scripted in section 12; AWS console montage included |

### Differentiators (what 90% of teams won't do)
1. **Real data, not mock data:** live Open-Meteo forecast driving the map via a scheduled AWS pipeline.
2. **Explainability:** every score decomposes into visible factor contributions.
3. **Trust layer for crowdsourcing:** AI vision verification + corroboration + rain-consistency + time decay. Judges always ask, "what about fake reports?"
4. **Underpass-specific insight** (depression depth + OSM underpass detection), not generic "elevation".
5. **Safe routing that compares routes** and says "avoids 2 flooded underpasses, +6 min".
6. **Closed action loop:** agent produces work orders and alerts, not just text.
7. **Honest evaluation:** a small labelled image set with measured vision accuracy, and an optional historical backtest.
8. **Scale-to-zero economics:** serverless costs ~nothing in dry weeks, scales in a storm.

---

## 4. Feature list (strict priority)

### P0 — MUST SHIP (the video is built from these; nothing else matters until these work)
| # | Feature | Notes |
|---|---|---|
| P0-1 | **Live Risk Map** | MapLibre map of Delhi zones coloured Safe/Watch/High/Critical; click for detail panel |
| P0-2 | **Explainable Risk Engine** | Weighted index (section 7) with factor bars; shared TypeScript module |
| P0-3 | **Live forecast pipeline** | EventBridge Scheduler → Lambda → Open-Meteo → DynamoDB snapshots every 15 min |
| P0-4 | **Rainfall Simulator** | Slider (0–100 mm/hr), recomputes map instantly client-side; labelled "SIMULATION" |
| P0-5 | **Citizen report + AI vision triage** | Photo → S3 → Bedrock multimodal → structured JSON → risk updates |
| P0-6 | **Safe-route navigator** | A→B, 2–3 alternatives, scored against hazard zones, recommended route highlighted |
| P0-7 | **AI Action Agent ("Ask Aquashield")** | Strands agent with tools; returns why + actions + alert draft |
| P0-8 | **Deployed on AWS with public URL** | Amplify frontend + SAM backend |

### P1 — SHOULD SHIP (adds the "wow" and the usability score)
| # | Feature |
|---|---|
| P1-1 | **Ops dashboard**: ranked hotspots, work orders (open → dispatched → resolved), pump dispatch suggestions |
| P1-2 | **Report trust score**: corroboration + rain consistency + decay; verified/unverified badge |
| P1-3 | **Bilingual alerts**: English + Hindi drafts from the agent; SNS email publish for the demo |
| P1-4 | **PWA install + geolocation** ("risk near me", "report here"), offline cached last-known map |
| P1-5 | **ETA-to-critical** ("critical in ~28 min") from 15-minute forecast |
| P1-6 | **Report TTL** (DynamoDB TTL, 6h auto-expire) so the map never shows stale ghosts |

### P2 — STRETCH (only after P0 + P1 are deployed and recorded-ready)
- Historical **backtest/replay** of a documented Delhi cloudburst day (Open-Meteo archive). Verify the date and rainfall yourselves before claiming anything.
- Amazon Polly Hindi "read alert aloud" button.
- Vision accuracy page (confusion matrix over 20–30 labelled images).
- Amazon Location Service as the primary router (see section 5).
- CloudWatch dashboard screenshot for "operational maturity".

### DO NOT BUILD
Native mobile app · login system for citizens · real MCD/PWD integration · IoT/hardware · custom model training · multiple environmental problems · payments · social features · SMS (India DLT registration is a trap; use email/SNS or push) · 15 AWS services for show.

---

## 5. Tech stack (final)

| Layer | Choice | Why / fallback |
|---|---|---|
| Frontend | **Next.js + TypeScript + Tailwind**, PWA manifest + service worker | You know it. Fallback: static export to S3 + CloudFront if Amplify SSR fights back |
| Map | **MapLibre GL JS** | Free vector rendering. Use a tile source allowed for your usage (Amazon Location Service maps, or an open provider). **Don't hammer the public OSM tile servers.** |
| Hosting | **AWS Amplify Hosting** | Counts as "deployed on AWS" |
| API | **API Gateway (HTTP API) + Lambda (Node.js/TypeScript)** | Standard, cheap, fast to build |
| IaC | **AWS SAM** (open-source CLI) | Reproducible deploys, an AWS open-source tool, and a good repo story |
| DB | **DynamoDB** (on-demand) with TTL | Zero idle cost; TTL = self-cleaning reports |
| Storage | **S3** with presigned uploads | Browser uploads directly, no big payload through Lambda |
| Scheduler | **EventBridge Scheduler** | Cron every 15 min to refresh forecast and recompute risk |
| AI vision | **Amazon Bedrock**, a current Claude Sonnet/Haiku-class multimodal model | Don't hard-code a model ID from memory. Check which models your account/region has enabled (inference profiles may be required) |
| Agent | **Strands Agents SDK** (open source) on **Bedrock**, in a dedicated **Python Lambda** | Python SDK is the best-documented path. If the TypeScript SDK is stable when you check, you may use it to keep one language |
| Alerts | **SNS** (email subscription for the demo) | Real AWS publish you can show on camera |
| Routing | **Amazon Location Service** route calculation (alternatives) **or** OSRM `alternatives=true` | The OSRM public demo server is not reliable. Timebox Location Service to 90 min, else fall back |
| Forecast | **Open-Meteo Forecast API** (`minutely_15` / `hourly` precipitation, no key) | Verify current usage terms; cache aggressively in DynamoDB so the demo never depends on a live call |
| Terrain | **Open-Meteo Elevation API**, precomputed offline | Compute "depression depth", see section 7 |
| Geo data | **OSM via Overpass**, precomputed offline into `zones.geojson` | Underpasses, waterways/drains, landuse. Never call Overpass live in the demo |
| Shared logic | `packages/risk-core` (TypeScript) | Same function used in Lambda and in the browser, so the simulator = the backend |
| Monitoring | CloudWatch logs + one dashboard | Easy AWS proof for the video |

**Security basics:** no keys in git; Lambda IAM roles with least privilege; API throttling on `/reports`; S3 bucket private (presigned URLs only); image size/type limits; ops routes behind a simple passcode check in the Lambda. Cognito only if you finish early.

---

## 6. Architecture

```
 Citizen PWA (Next.js, Amplify)                 Ops Dashboard (same app, /ops)
        │                                              │
        └──────────────► API Gateway (HTTP API) ◄──────┘
                              │
        ┌─────────────┬───────┴────────┬──────────────┬───────────────┐
        ▼             ▼                ▼              ▼               ▼
   Lambda: zones  Lambda: reports  Lambda: route  Lambda: agent   Lambda: workorders
        │             │   │             │          (Python,           │
        │             │   │             │           Strands)          │
        │             │   └─► S3 (images)           │                 │
        │             │   └─► Bedrock (vision)      └─► Bedrock       │
        ▼             ▼                                  │ tools call  ▼
                 ┌───────────── DynamoDB ──────────────┐ the APIs  SNS (alerts)
                 │ Zones · RiskSnapshots · Reports(TTL)│
                 │ WorkOrders · Alerts                 │
                 └─────────────────▲───────────────────┘
                                   │
   EventBridge Scheduler (15 min) ─► Lambda: ingest ─► Open-Meteo ─► risk-core ─► snapshots
```

---

## 7. Risk engine spec (the credibility core)

Call it a **Flood Risk Index (0–100)**, *not* a probability. Say so if asked. It is a transparent weighted index, which is a feature, not a weakness.

**Per-zone static attributes** (precomputed into `zones.geojson`):
- `isUnderpass` (OSM tunnel/layer −1 on a road)
- `depressionDepthM` = zone elevation − mean elevation within ~500 m (a bowl matters; absolute elevation does not)
- `drainageDeficit` 0–100 (proxy: distance to nearest mapped drain/waterway/canal, share of built-up land use; higher = worse)
- `historyScore` 0–100 (seeded from publicly reported Delhi waterlogging points; cite your source in the repo)
- `criticalRainMmHr` (zone's tolerance threshold; underpasses lower)

**Live inputs:** `rainNowMmHr`, `rain3hForecast[]`, `rain24hMm`, active verified reports within 150 m.

**Normalise each factor to 0–100, then:**
```
risk = 0.30*rainNow
     + 0.15*antecedent24h
     + 0.15*depression
     + 0.15*drainageDeficit
     + 0.10*history
     + 0.15*liveEvidence
if isUnderpass: risk = min(100, risk * 1.10)
```
where `rainNow = clamp(rainNowMmHr / criticalRainMmHr, 0, 1.5)/1.5 * 100`.

**Tiers:** 0–29 SAFE 🟢 · 30–54 WATCH 🟡 · 55–74 HIGH 🟠 · 75–100 CRITICAL 🔴

**ETA-to-critical:** walk the 15-minute forecast, recompute risk at each step with forecast rain, return the first timestamp where risk ≥ 75 (`"already critical"` if now; `null` if not within 3 h).

**Output object (always return the breakdown):**
```json
{ "zoneId": "z_minto", "risk": 82, "tier": "CRITICAL", "etaMin": 28,
  "factors": { "rainNow": 92, "antecedent24h": 70, "depression": 75,
               "drainageDeficit": 80, "history": 60, "liveEvidence": 90 },
  "contributions": { "rainNow": 27.6, "...": "..." },
  "topReasons": ["Heavy rain now", "Low-lying underpass", "Blocked drain reported"] }
```

**Tests:** write 8–10 unit tests for `risk-core` (monotonic in rain, tier boundaries, ETA edge cases). Cheap, and it makes the repo look serious.

---

## 8. Citizen report + AI vision spec

**Flow:** pick photo → presigned PUT to S3 → `POST /reports` → Lambda calls Bedrock with the image → structured JSON → trust score → store (TTL 6 h) → recompute zone risk → return result to UI.

**Vision prompt must force JSON only.** Schema:
```json
{
  "isRoadScene": true,
  "floodedRoad": true,
  "waterDepthTier": "ankle | knee | waist | vehicle_submerged | none",
  "blockedDrain": false,
  "debrisOrWasteObstruction": false,
  "vehiclesStranded": false,
  "confidence": 0.0,
  "rejectReason": null,
  "explanation": "one sentence"
}
```
**Rules:** reject non-road/irrelevant images (`isRoadScene=false`); validate the JSON against a schema; on malformed output retry once, then mark "needs review". Never trust a single report blindly.

**Trust score (0–1):**
`trust = visionConfidence × corroboration × rainConsistency × ageDecay`
- *corroboration:* more independent reports within 150 m / 30 min → higher
- *rainConsistency:* flood report during dry forecast gets down-weighted
- *ageDecay:* linear/exponential decay over the 6 h TTL
- Optional cheap check: image EXIF timestamp/GPS vs submission

**Evaluation set (do this, it's rare):** collect 20–30 images (your own photos, or properly licensed ones with credits). Label them. Run them through the pipeline and report accuracy in the README. Honest numbers beat fake perfection.

---

## 9. AI Action Agent spec (Strands Agents + Bedrock)

**Rule: the agent never invents numbers.** All risk, rain and report facts come from tools. The agent explains and recommends.

**Tools (each calls your own API or DynamoDB):**
| Tool | Returns |
|---|---|
| `get_zone_risk(zone_id)` | risk, tier, factors, ETA |
| `get_forecast(zone_id)` | next 3 h rain series |
| `get_nearby_reports(zone_id, radius_m)` | verified reports + trust |
| `get_nearby_zones(zone_id)` | neighbouring hazards |
| `plan_safe_route(origin, dest)` | route options with hazards |
| `create_work_order(zone_id, type, priority, note)` | `pump_dispatch | drain_cleaning | barricade | traffic_diversion` |
| `draft_alert(zone_id, audience, lang)` | alert text (EN/HI) |
| `publish_alert(alert_id)` | SNS publish (ops approval flag) |

**Output (validated structured JSON, rendered as the Command Center UI):**
```json
{ "summary": "Minto Bridge underpass is CRITICAL (82).",
  "why": ["...", "..."],
  "actions": [{"type":"pump_dispatch","priority":"P1","reason":"..."}],
  "alertDraft": {"en":"...","hi":"..."},
  "workOrderIds": ["wo_123"],
  "confidenceNote": "Based on forecast at 14:15 and 3 verified reports." }
```
**UX guardrails:** "Create action" requires a click (human in the loop), and the UI shows which tool outputs the plan used. That reads as responsible AI and impresses judges.

**Latency:** API Gateway HTTP APIs cap at ~30 s. Use a fast model, keep tool calls ≤ 4, and show a streaming-style loading state.

---

## 10. Data model and API contract (freeze this in the first 90 minutes)

**DynamoDB tables (on-demand):**
- `Zones` — pk `zoneId` (static attrs + geometry centroid)
- `RiskSnapshots` — pk `zoneId`, sk `ts`, TTL 48 h
- `Reports` — pk `zoneId`, sk `ts#id`, TTL 6 h (fields: s3Key, vision JSON, trust, status)
- `WorkOrders` — pk `id` (zoneId, type, priority, status, createdAt)
- `Alerts` — pk `id` (zoneId, lang, text, status, publishedAt)

**REST endpoints:**
```
GET   /health
GET   /zones                       -> [{id,name,lat,lng,risk,tier,etaMin}]
GET   /zones/{id}                  -> detail + factors + forecast + reports
POST  /reports/presign             -> {uploadUrl, key}
POST  /reports                     -> {analysis, trust, updatedRisk}
GET   /reports?zoneId=             -> active reports
POST  /route                       -> {routes:[{geometry,durationMin,hazards[],score,recommended}]}
POST  /agent/ask                   -> structured plan (section 9)
GET   /workorders                  -> list
PATCH /workorders/{id}             -> status change
POST  /alerts/{id}/publish         -> SNS publish
```
Put the shared TypeScript types in `packages/types`. **Whoever changes a contract tells the group chat first.**

**Safe-route scoring:** for each candidate route polyline, find zones within ~40 m. `score = durationMin + λ·Σ(hazardWeight(tier))`; any CRITICAL zone on the path marks the route "unsafe" and it is never recommended if an alternative exists. Output a plain sentence: *"Avoids 2 flooded underpasses · +6 min."* Pick your demo origin/destination so the default fast route crosses a critical underpass.

---

## 11. Repo structure

```
aquashield/
├── apps/web/                 # Next.js PWA + /ops dashboard
├── packages/risk-core/       # shared TS risk engine + tests
├── packages/types/           # shared API types
├── services/api/             # TS Lambdas (zones, reports, route, workorders)
├── services/agent/           # Python Lambda: Strands agent + tools
├── services/ingest/          # forecast ingestion Lambda
├── data/                     # build scripts + zones.geojson + eval images (licensed)
├── infra/template.yaml       # AWS SAM
├── docs/                     # architecture diagram, screenshots, eval results
└── README.md
```
README sections: Problem · Solution · How it works · Architecture · AWS services · Risk engine · AI agent · Evaluation · Demo · Screenshots · Impact · Limitations · Future scope · AI tools used · Team.

---

## 12. Team split (4 owners, clear interfaces)

### 👤 P1 — Frontend & UX Lead (owns what judges *see*)
**Deliverables**
- Next.js app shell, design system (colour tokens for the 4 tiers, typography, dark-mode-friendly map)
- Risk map, zone detail panel with factor bars, rainfall simulator slider
- 3-tap report flow with camera/upload and a result card (verified badge, trust)
- Safe-route screen (A→B inputs, route cards, "avoids X, +Y min")
- PWA manifest + service worker, geolocation, loading/error/empty states, Hindi/English toggle
- Ops dashboard UI (with P2's endpoints)
**Done when:** a stranger on a phone can open the URL and report a flood and find a safe route without help.
**Depends on:** `packages/types`, mock JSON from P2 in hour 2 so you're never blocked.

### 👤 P2 — Cloud & Backend Lead (owns *Built on AWS* + execution)
**Deliverables**
- SAM template: API Gateway, Lambdas, DynamoDB tables (TTL), S3 bucket + CORS + presign, EventBridge schedule, SNS topic, IAM least privilege
- All TS Lambdas for the contract in section 10, plus the **ingest Lambda** (Open-Meteo → risk-core → snapshots)
- Amplify deployment with env wiring, CloudWatch log groups + one dashboard, AWS Budgets
- Seed script for zones; throttling and size limits on reports
- **AWS proof for the video:** clean console clips of Lambda, DynamoDB items, S3 object, Bedrock invocation, EventBridge rule
**Done when:** a fresh `sam deploy` recreates everything and the public URL works end-to-end.
**First 90 min:** publish a deployed `/health` and `/zones` returning stub data so P1 can integrate.

### 👤 P3 — AI Lead (owns *the wow*)
**Deliverables**
- Bedrock vision triage Lambda logic (prompt, schema validation, retry, reject path)
- Trust-score function (with P4's `risk-core` interface)
- Strands agent in Python Lambda with all tools in section 9, structured output validated with Pydantic
- Bilingual alert drafting (EN/HI) and `draft_alert`/`publish_alert` flow
- Evaluation set of 20–30 labelled images + a script that outputs accuracy for the README
- **Writes the AWS Builder Center blog** (AirPods prize): problem, stack, "what fought back"
**Done when:** upload a real flooded-road photo → structured analysis in <8 s; "Ask Aquashield" returns a grounded plan in <20 s.
**Tip:** enable Bedrock access today and test one image call in the first hour.

### 👤 P4 — Data, Risk & Routing Lead (owns *credibility*)
**Deliverables**
- Data pipeline scripts: Overpass (underpasses, drains/waterways), elevation → `depressionDepthM`, drainage deficit, seed `historyScore` from cited public sources → `zones.geojson` (~30–40 zones)
- `packages/risk-core`: risk function, tiers, ETA-to-critical, unit tests
- Route scoring logic and the `/route` Lambda (Amazon Location Service or OSRM alternatives; timebox)
- Rainfall simulator logic (shared with frontend), demo scenario selection (the origin/destination whose default route hits a critical underpass)
- **Owns the demo script, narrative and impact claims** (sourced); P1/P2 record
- Stretch: historical backtest
**Done when:** every zone shows a defensible score with a visible breakdown, and the simulator and backend produce identical numbers.

### Shared (spread the story work)
| Task | Owner |
|---|---|
| Architecture diagram + README + repo polish | P2 |
| Demo video recording + editing + YouTube upload | P1 (script by P4, AWS clips by P2) |
| Builder Center blog | P3 |
| Submission form + final checks | Team lead (P2) |

---

## 13. Timeline (the deadline hour is unpublished, so this is conservative)

**Thu Oct 8 (today)**
- 0:00–1:00 Hour-0 checklist (section 1) · agree contracts
- 1:00–4:00 P2 deploys skeleton + stub API · P1 map shell · P4 builds `risk-core` + starts zone data · P3 tests Bedrock vision on 3 images
- Evening: **Goal: map on a deployed URL with real zones, stub risk**

**Fri Oct 9 (full build day)**
- Morning: real risk engine wired · ingest pipeline live · simulator working
- Midday: report flow → S3 → Bedrock → risk update end-to-end
- Afternoon: route scoring + UI · agent tools
- Night: **Milestone: all P0 working on the deployed URL (even if ugly)**

**Sat Oct 10**
- Morning: P1 features (ops dashboard, trust, bilingual) · agent polish
- Optional DTU: show the build to mentors/Amazon team and **fix what they criticise**
- 6 PM: **FEATURE FREEZE.** Bug-fix only after this
- Night: rehearse the demo twice · record first take

**Sun Oct 11**
- Morning: final recording/edit, upload to YouTube (unlisted), **open the link signed out**
- README, screenshots, architecture diagram, writeup, blog published on Builder Center
- **Submit by morning**, well ahead of the published deadline. Then relax.

**Rule:** a deployed, boring app beats a brilliant local one. Deploy daily.

---

## 14. The 3-minute demo script (target 2:50)

| Time | Screen | Voiceover gist |
|---|---|---|
| 0:00–0:20 | Hook: your own photo/footage of a flooded underpass (credited) | "Every monsoon, Delhi's underpasses trap people. They flood in minutes. Nobody warns you before you drive in." |
| 0:20–0:50 | Live map, real forecast data, click an underpass | "Aquashield scores waterlogging risk street by street. Not a black box: here's why it's 61." Show factor bars. |
| 0:50–1:15 | Rainfall simulator 30 → 60 → 80 | "What if rain doubles? Map turns red. Same engine as the backend." Label SIMULATION. |
| 1:15–1:50 | Citizen uploads blocked-drain/flood photo | "Citizens report in 3 taps. Amazon Bedrock verifies the photo, rejects fakes, scores trust. Risk jumps." |
| 1:50–2:15 | Safe route | "Fast route goes through a critical underpass. Aquashield's route avoids it for +6 minutes." |
| 2:15–2:40 | Ops dashboard + Ask AI | "For the city: a Strands agent explains why, drafts an alert in English and Hindi, and creates a work order for pump dispatch." |
| 2:40–2:55 | **AWS proof montage** (Lambda, DynamoDB, S3, Bedrock, EventBridge, SNS) + architecture | "Fully serverless on AWS, scale-to-zero in dry weeks, scales in a storm." |
| 2:55 | End card | "Don't react to floods. Predict them." |

**Video rules:** record the final take **after** feature freeze; captions on; no fake data without a label; show real AWS console windows (not just the diagram); stay under 3:00; test the YouTube link signed out.

---

## 15. Submission checklist

- [ ] Public repo, README complete, commit history spans the event window
- [ ] Deployed public URL works on a phone and in an incognito window
- [ ] YouTube video < 3:00, shows AWS console/services, opens signed out
- [ ] Writeup: problem · build · where AWS fits · **AI coding tools used** · data sources + licences/credits
- [ ] All images/data credited with licences
- [ ] Builder Center blog published and linked (AirPods prize)
- [ ] All 4 members: registered, checked in, Builder Center verified
- [ ] One submission, by one member, on the hackathon's own form, early

---

## 16. Risks and fallbacks

| Risk | Mitigation |
|---|---|
| Bedrock access/region/model hiccup | Request access in hour 1; test early; keep model ID in env var; have a second model enabled |
| Open-Meteo down/rate-limited | Cache last forecast in DynamoDB; ingest Lambda is the only caller; demo reads from cache |
| Routing service flaky | Fallback: OSRM alternatives; last resort: precomputed alternative polylines for the demo OD pair (disclose in the README) |
| Amplify SSR build trouble | Static export to S3 + CloudFront |
| Agent too slow | Fast model, ≤ 4 tool calls, cache zone context |
| Merge conflicts | Separate folders per owner; contracts in `packages/types`; small PRs |
| Cost surprise | Budgets, API throttling, TTLs, concurrency limits |
| Last-hour panic | Feature freeze Sat 6 PM; record video Sun morning |

---

# PART B — PROMPTS FOR YOUR AI CODING AGENT

(Paste **Master Context** into your AI coding tool first, then the person's **Role Prompt**. Note the tools you use for the writeup.)

## B1. MASTER CONTEXT PROMPT (everyone pastes this first)

```
You are a senior full-stack + cloud engineer helping a 4-person student team build
"Aquashield" for the WeMakeDevs x AWS "Environmental Hacks" hackathon (Track: Heat and Water).
The project must be built NEW during Oct 8-11, 2026, deployed on AWS, and judged from a
public repo + a <3 minute demo video. Judges score: Idea & Impact, Built on AWS, Design &
Usability, Execution (working > ambitious), Demo video.

PRODUCT: Hyperlocal urban flood early warning + safe routing for Delhi, focused on
underpass waterlogging. Loop: Detect -> Verify -> Predict -> Explain -> Act.
Citizens: PWA map, 3-tap flood report with photo, safe route, alerts.
City ops: dashboard with ranked hotspots, AI action plans, work orders, bilingual alerts.

STACK (do not change without asking): Next.js + TypeScript + Tailwind (PWA), MapLibre GL JS,
AWS Amplify Hosting; API Gateway HTTP API + Lambda (Node.js TypeScript); DynamoDB on-demand
with TTL; S3 presigned uploads; EventBridge Scheduler; SNS; Amazon Bedrock (current Claude
multimodal model, model ID from env var, never hard-coded); Strands Agents SDK (Python Lambda);
AWS SAM for IaC; Open-Meteo for forecast+elevation; OSM/Overpass for precomputed geo data;
Amazon Location Service or OSRM for route alternatives. Shared TypeScript packages:
packages/risk-core and packages/types.

NON-NEGOTIABLE RULES:
1. Simplicity and reliability over features. One feature that works beats five that almost do.
2. Real data wherever possible; anything simulated/seeded must be labelled in UI and README.
3. Risk is an explainable weighted index 0-100 (NOT a probability); always return the factor
   breakdown. Weights: rainNow .30, antecedent24h .15, depression .15, drainageDeficit .15,
   history .10, liveEvidence .15; underpass multiplier 1.10 capped at 100.
   Tiers: <30 SAFE, 30-54 WATCH, 55-74 HIGH, >=75 CRITICAL.
4. AI agent never invents numbers; facts come from tools. Structured JSON outputs validated by schema.
5. Never commit secrets. Least-privilege IAM. Throttle write endpoints.
6. Write small, typed, testable modules. Add loading/error/empty states everywhere.
7. Anything not written by us needs attribution + licence in the README.
8. Do not call Overpass/Open-Meteo directly from the browser; cache via ingest Lambda.
9. Ask before changing any API contract; update packages/types in the same commit.

API CONTRACT: GET /health, GET /zones, GET /zones/{id}, POST /reports/presign, POST /reports,
GET /reports, POST /route, POST /agent/ask, GET /workorders, PATCH /workorders/{id},
POST /alerts/{id}/publish. (See playbook section 10 for payloads.)

Work in small steps. After each step tell me what to run to verify it, and what could break.
```

## B2. P1 — Frontend & UX prompt

```
ROLE: Frontend & UX lead for Aquashield. Build apps/web (Next.js + TS + Tailwind, PWA).

BUILD, IN ORDER:
1. App shell, design tokens (SAFE green, WATCH yellow, HIGH orange, CRITICAL red; high contrast,
   large touch targets), mobile-first layout, EN/HI language toggle.
2. Full-screen MapLibre risk map: zones as colour-coded markers/polygons from GET /zones,
   click opens a bottom sheet (mobile) / side panel (desktop) with risk, tier, ETA-to-critical,
   factor bars (from the breakdown), active reports, "Ask Aquashield", "Report", "Safe route" buttons.
3. Rainfall Simulator: slider 0-100 mm/hr that calls packages/risk-core in the browser to
   recompute all zones instantly. Show a clear "SIMULATION" badge when active, and a reset button.
4. Report flow (3 taps max): choose type -> take/upload photo -> submit. Presign -> PUT to S3 ->
   POST /reports. Show analysis card: detected items, confidence, trust, verified/unverified badge,
   and how the zone's risk changed (old -> new).
5. Safe-route screen: origin (use my location) + destination search, 2-3 route cards with
   duration, hazards avoided, recommended badge; draw routes on map; sentence like
   "Avoids 2 flooded underpasses - +6 min".
6. Ops dashboard at /ops (passcode gate): ranked hotspots, agent plan card (summary, why, actions,
   EN/HI alert draft), buttons "Create work order" and "Publish alert" (human confirmation),
   work-order board (open/dispatched/resolved).
7. PWA: manifest, icons, service worker caching last-known zones for offline, geolocation "risk near me".
8. Polish: skeleton loaders, error toasts, empty states, subtle map animation on risk change.

Start by generating mock JSON matching packages/types so you are never blocked by the backend.
Keep the demo path (map -> click -> simulate -> report -> route -> ask AI) flawless on a phone viewport.
```

## B3. P2 — Cloud & Backend prompt

```
ROLE: Cloud & backend lead for Aquashield. Own infra/template.yaml (AWS SAM) and services/api + services/ingest.

BUILD, IN ORDER:
1. SAM skeleton deployed in the first 90 minutes: HTTP API, Lambda (Node 22/TypeScript, esbuild),
   DynamoDB tables (Zones, RiskSnapshots[TTL 48h], Reports[TTL 6h], WorkOrders, Alerts), S3 bucket
   (private, CORS, presigned PUT), SNS topic, EventBridge Scheduler (every 15 min -> ingest Lambda).
   Return stub data for /health and /zones immediately so the frontend can integrate.
2. Seed script that loads data/zones.geojson into Zones.
3. Ingest Lambda: for each zone fetch Open-Meteo forecast (batch by location where possible),
   store raw forecast in DynamoDB, compute risk via packages/risk-core, write RiskSnapshots.
   Cache last good forecast; if Open-Meteo fails, reuse cache and flag staleness.
4. Lambdas for the full API contract: zones, zone detail, presign, reports (calls the vision module
   from P3), route (calls P4's scoring), workorders, alerts publish (SNS).
5. Security: least-privilege IAM per function, request validation (zod), size/type limits on uploads,
   API throttling, CORS limited to the Amplify domain, ops passcode check from env/SSM.
6. Amplify Hosting for apps/web with environment variables. Fallback: static export to S3 + CloudFront.
7. CloudWatch log groups + a single dashboard (invocations, errors, latency). AWS Budgets alarms.
8. Produce a clean architecture diagram (docs/architecture.png) and a README "AWS services" section.
9. Prepare 6-8 short, clean AWS console screen recordings/screenshots for the demo video.

Every function must have structured logs and return consistent error JSON. Make `sam build && sam deploy`
reproducible from a clean account. Tell me exactly which AWS console steps I must do manually.
```

## B4. P3 — AI prompt

```
ROLE: AI lead for Aquashield. Own the Bedrock vision triage, trust scoring, Strands agent, bilingual alerts, evaluation.

BUILD, IN ORDER:
1. Bedrock vision module (TypeScript, used by the reports Lambda): take S3 image bytes, call the
   multimodal Claude model (model ID from env var), force JSON-only output matching:
   {isRoadScene, floodedRoad, waterDepthTier(ankle|knee|waist|vehicle_submerged|none), blockedDrain,
   debrisOrWasteObstruction, vehiclesStranded, confidence, rejectReason, explanation}.
   Validate with zod, retry once on malformed output, reject non-road images, handle timeouts.
2. Trust score function: trust = visionConfidence x corroboration(150m/30min) x rainConsistency
   (down-weight flood reports during dry forecasts) x ageDecay(6h). Unit-test it.
3. Strands agent (Python Lambda, services/agent) on Bedrock with tools:
   get_zone_risk, get_forecast, get_nearby_reports, get_nearby_zones, plan_safe_route,
   create_work_order, draft_alert, publish_alert. Tools call our API/DynamoDB. The agent never
   invents numbers. Final output must validate against a Pydantic schema:
   {summary, why[], actions[{type,priority,reason}], alertDraft{en,hi}, workOrderIds[], confidenceNote}.
   Creating work orders / publishing alerts must require an explicit flag set by the UI (human in the loop).
4. Keep agent latency under ~20s: fast model, max 4 tool calls, concise system prompt.
5. Evaluation: build data/eval/ with 20-30 labelled images (own photos or properly licensed, with credits),
   a script that runs them through the vision module and prints accuracy + a confusion matrix for the README.
6. Prompt files live in services/*/prompts/ with versioned comments.
7. After the app works, draft the AWS Builder Center blog: problem, architecture, what fought back,
   numbers from the evaluation, AI coding tools used.

First task in the first hour: prove one Bedrock multimodal call works from Lambda in the chosen region
and report any model-access or inference-profile errors immediately.
```

## B5. P4 — Data, Risk & Routing prompt

```
ROLE: Data, risk and routing lead for Aquashield. Own data/, packages/risk-core, the /route logic and the demo scenario.

BUILD, IN ORDER:
1. packages/risk-core (TypeScript, zero dependencies, 100% pure functions):
   computeRisk(zone, live) -> {risk, tier, factors, contributions, topReasons};
   computeEta(zone, forecast15min) -> minutes until risk >= 75 or "already" or null;
   tier thresholds <30/55/75; weights rainNow .30, antecedent24h .15, depression .15,
   drainageDeficit .15, history .10, liveEvidence .15; underpass multiplier 1.10 capped 100.
   Add 8-10 unit tests (monotonic in rain, tier boundaries, ETA edge cases).
2. Data pipeline scripts (data/scripts, Node or Python) that generate data/zones.geojson (~30-40 zones
   across Delhi): OSM Overpass underpasses (tunnel=yes or layer=-1 on roads), nearby waterways/drains,
   built-up land use share, Open-Meteo elevation -> depressionDepthM (zone elevation minus mean of
   ~500m ring), drainageDeficit 0-100, historyScore seeded from publicly reported waterlogging points
   (store source URLs in data/SOURCES.md), criticalRainMmHr per zone (lower for underpasses).
   Cache all raw API responses to disk so the pipeline is reproducible offline.
3. Route logic: get 2-3 alternatives from Amazon Location Service CalculateRoutes (timebox 90 minutes)
   or OSRM alternatives=true as fallback. For each polyline find zones within ~40m;
   score = durationMin + lambda x sum(hazardWeight(tier)); routes crossing a CRITICAL zone are
   "unsafe" and never recommended if an alternative exists. Return a sentence like
   "Avoids 2 flooded underpasses - +6 min".
4. Choose and document the demo scenario: an origin/destination pair whose default fastest route crosses
   a critical underpass under the simulated rainfall. Document exact coordinates and slider values in docs/DEMO.md.
5. Draft the demo script (docs/DEMO.md) following the 3-minute timing table, with only sourced claims.
6. Stretch: historical backtest using Open-Meteo archive for a documented Delhi heavy-rain day
   (verify date and rainfall yourself first) - show which zones the model would have flagged.

Everything must be reproducible and explainable: if a judge asks "why is this zone 82?", the UI must answer.
```

---

## 17. Last advice

1. **Deploy on day 1.** A working URL early removes the biggest execution risk.
2. **Protect the demo path.** Map → click → simulate → report → route → ask AI. Rehearse it until it can't fail.
3. **Cut, don't add.** If something isn't working by Saturday 6 PM, remove it from the demo and the writeup.
4. **Be honest on screen.** "Simulation", "risk index", "seeded from public sources" are strengths, not weaknesses.
5. **Use the Discord and Saturday's mentors.** Ask for feedback early, then act on it.
6. **The fast-track interview judges the project and you.** Know every layer of your stack well enough to explain it in an interview.
