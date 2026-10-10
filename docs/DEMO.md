# DEMO.md — Aquashield 3-Minute Demo Script

> **For presenters:** This script is for the live demo or recorded video.
> Steps marked `SIMULATION` use seeded/estimated data. Steps marked `PLANNED`
> indicate features not yet integrated. Step marked `AWS` must show actual
> AWS Console for judging criteria "Built on AWS".
>
> **Demo date:** Oct 2026 (hackathon). Verify all steps against the deployed app
> before recording. Update this file if features change.

---


| Time | Screen | Voiceover gist |
|---|---|---|
| 0:00-0:20 | Your own photo/footage of a flooded underpass (credited) | "Every monsoon, Delhi's underpasses trap people. They flood in minutes. Nobody warns you before you drive in." |
| 0:20-0:50 | Live map, real forecast, click an underpass | "Aquashield scores waterlogging risk street by street. Not a black box: here's why Minto is WATCH today — and what a downpour would do to it." Show factor bars |
| 0:50-1:15 | Rainfall simulator 0 -> 40 -> 60 | "What if rain doubles? The same engine as the backend recomputes risk — watch it climb to CRITICAL." Show SIMULATION label |
| 1:15-1:50 | Citizen uploads photo | "3 taps. Amazon Bedrock verifies the photo, rejects fakes, scores trust. Risk jumps." (show old -> new) |
| 1:50-2:15 | Route alternatives + hazard flags | "Two routes. The engine flags every flooded zone along each — today that's WATCH, but crossing a CRITICAL zone never gets recommended." |
| 2:15-2:40 | Ops dashboard + Ask AI | "A Strands agent explains why, drafts an alert in English and Hindi, creates a work order for pump dispatch." |
| 2:40-2:55 | **AWS proof montage** + architecture | "Fully serverless on AWS: Lambda, DynamoDB, S3, Bedrock, EventBridge, SNS. Scales to zero in dry weeks." |
| 2:55 | End card | "Don't react to floods. Predict them." |
## Demo Setup

### Pre-demo checks
- [ ] Deployed URL is live: `https://<Amplify URL>` (P2 confirms)
- [ ] `apps/web` is connected to real API (not mock)
- [ ] DynamoDB has zones seeded from `data/zones.geojson` (P2 confirms)
- [ ] Ingest Lambda has run at least once (risk snapshots exist)
- [ ] AWS Console is open to: Lambda → Functions, DynamoDB → Tables
- [ ] Rainfall simulator slider is visible in zone detail panel
- [ ] `docs/DEMO.md` coordinates match the deployed zone data

### Demo data
| Parameter | Value | Note |
|-----------|-------|------|
| Selected zone | Minto Bridge Underpass (`z_minto`) | `lat=28.6328, lng=77.2197` |
| Live risk (today) | `36 / WATCH` | Real value from the deployed API on 10-Oct; varies with rain — read it off the screen, don't hard-code |
| Origin (demo route) | Central Delhi (app default) | `[28.61, 77.2]` — the app's default "From: Central Delhi" |
| Destination (demo route) | Minto Bridge Underpass (`z_minto`) | `[28.6328, 77.2197]` — destination chip |
| Rainfall slider values | `0 -> 40 -> 60 mm/hr` | SIMULATION |
| Minto at 0 mm/hr (sim) | `60 / HIGH` | recomputed by `@aquashield/risk-core` |
| Minto at 40 mm/hr (sim) | `85 / CRITICAL` | recomputed by `@aquashield/risk-core` |
| Minto at 60 mm/hr (sim) | `93 / CRITICAL` | recomputed by `@aquashield/risk-core` |
| Simulation label | `⚠️ SIMULATION — seeded from estimates` | Always show this badge |

> **Verified against the live API on 10-Oct-2026:** all 15 zones seeded with fresh snapshots (~5 min old), Minto `36/WATCH`. The risk + route numbers below were re-verified live; simulator values are the literal output of `computeRisk` with the frontend's Minto seed.

---

## Demo Script (3:00 total)

### [0:00–0:15] Title & Map Introduction
**Scene:** Full-screen risk map of Delhi, zone markers colored by tier.

**Narration:**
> "Aquashield — hyperlocal urban flood early warning for Delhi's underpasses.
>  Every marker is a real location with live risk computed from rainfall, drainage,
>  and citizen reports. This is not a mock — these are real coordinates, seeded
>  from OSM, municipal reports, and SRTM elevation data."

**Action:** Pan/zoom the map to show zone distribution. Point out the highest-risk zones
(currently ISBT Kashmere Gate ~39 / WATCH and Minto Bridge ~36 / WATCH — yellow markers).

**Presenter note:** If the map is slow, zoom in on Central Delhi to show 3-4 zones.

---

### [0:15–0:45] Zone Risk Inspection
**Scene:** Click Minto Bridge marker → zone detail panel slides in.

**Expected UI (live, verified 10-Oct):**
- Risk score: **36** — WATCH (live; read current value off screen)
- Tier badge: 🟡 WATCH
- ETA to critical: **n/a** (forecast shows no critical within 3 h — dry day)
- Factor breakdown bars: drainageDeficit 82, depression 80, history 88, rainNow 0, antecedent24h ≈ 0, liveEvidence 0
- Top reasons: "Poor drainage nearby", "Low-lying / bowl-shaped location", "Known waterlogging history"

> **Presenter note:** A dry October day is honest — Minto is a real hotspot (`drainage 82`, `depression 80`, `history 88`) but without rain it stays WATCH. That fixes the demo, then the **rainfall simulator** does the drama (next scene).

**Narration:**
> "Minto Bridge Underpass. Live risk 36 — WATCH. Not a black box — the breakdown
>  shows exactly what's driving it: this underpass sits in a 4.8-metre bowl with
>  poor drainage and a long waterlogging history. Right now it's not raining,
>  so it's watch-and-wait. These numbers come from the risk engine in
>  `packages/risk-core`, refreshed every 15 minutes from live weather."

**Action:** Click through the factor bars. The **⚠️ SIMULATION** badge only appears once the slider is used — it's a separate screen.

**Presenter note:** If live data is stale, show the "stale data" badge and say:
> "This data is 50 minutes old — the ingest Lambda updates every 15 minutes."

---

### [0:45–1:15] Rainfall Simulator
**Scene:** Rainfall simulator slider in zone detail panel.

**Action:** Drag slider to `60 mm/hr`.

**Expected change (computed, verified via `@aquashield/risk-core`):**
- Risk: 60 → **93** (SIMULATION) — crosses into **CRITICAL**
- Tier: HIGH → **CRITICAL**
- Factor bars update: rainNow jumps 0% → **100%**

**Narration:**
> "Now let's simulate 60 millimeters per hour — a record-breaking deluge.
>  The simulator seeds Minto's baseline at risk 60 — HIGH — because of its bad
>  drainage and waterlogging history. Watch the rainNow factor jump with the slider.
>  The same engine as the backend: at 60 mm/hr, Minto hits 93 — CRITICAL.
>  The formula never changes between simulator and production."

**Presenter note:** Reset the slider to 0 after demo (risk returns to 60 HIGH, the seed baseline). Say:
> "Resetting to baseline — this was a simulation."

---

### [1:15–1:45] Citizen Report Submission
**Scene:** Report flow — 3 taps.

**Expected flow:**
1. Tap **"Report flooding"** button
2. Camera opens → take photo of standing water (or upload)
3. Select type: `flooding`
4. Submit → loading state → result card (from `mocks/report-response.json` unless live):
   - AI analysis: "Waist-deep water, a vehicle is stranded." (mock `explanation`; live = model text)
   - Confidence: 88% / Trust: 0.74
   - Status: `verified` badge
   - Previous risk 72 → updated risk **89 CRITICAL** (mock shows the delta style)

**Narration:**
> "A citizen reports flooding at this underpass. The photo is analyzed by
>  Amazon Bedrock's multimodal model — checking if it's a road scene,
>  measuring water depth, looking for blocked drains.
>  Verified report raises the liveEvidence factor, pushing risk higher.
>  All reports expire after 6 hours via DynamoDB TTL."

**Presenter note:** If S3/Bedrock is not yet connected, show a mock result card and say:
> "PLANNED: Photo upload → S3 → Bedrock vision → DynamoDB.
>  This is the end-to-end flow we're building."

---

### [1:45–2:15] Hazard-Aware Route Selection
**Scene:** Route panel — app default origin "Central Delhi" `[28.61, 77.2]`, destination chip = Minto Bridge Underpass.

**Expected routes (live OSRM, verified 10-Oct):**
| Route | Duration | Distance | Hazards (live tiers) | Recommended |
|-------|----------|----------|----------------------|-------------|
| `r_fast` | ~7 min | 3.2 km | Minto Bridge 🟡 WATCH (near route) | ✅ |
| `r_alt`  | ~7 min | 3.3 km | Minto Bridge 🟡 WATCH (near route) | — |

_(If you route Central Delhi → ITO instead: two alternatives ~9.6/9.8 min, hazards = ITO 🟢 SAFE.)_

> **Honesty note:** The engine flags every zone within ~40 m of a polyline. Today all 15 zones are SAFE/WATCH (dry October), so **no live route is `unsafe`** — a route is only marked unsafe and never recommended when it crosses a **CRITICAL** zone. That state is reachable in a real downpour (or in the simulator on the map). Do NOT claim a live route currently avoids a flooded underpass — it doesn't today.

**Route polyline on map:** Both routes drawn. Recommended route in the default accent, alternative in grey. Hazard chips show "Minto Bridge Underpass".

**Narration:**
> "Requesting a route from Central Delhi to Minto Bridge.
>  OSRM returns two alternatives. The engine checks every segment of the
>  polyline against our zone database and flags what each route touches —
>  here, the Minto underpass, WATCH today. The scoring prefers the route with
>  the lowest hazard-weighted time. On a day with real rain, when a zone is
>  CRITICAL, any route crossing it is marked unsafe and the safe alternative
>  is always recommended instead — never the flooded one."

**Action:** Click the recommended route to highlight it on the map. Show the summary and hazard chips.

**Fallback if you must show an "avoid a CRITICAL underpass" moment:** run the route against `mocks/route-response.json` (fastest crosses Minto CRITICAL +6 min, safe alternative) and say out loud it is a **SIMULATION** polyline — per AGENTS.md, any simulated polyline must be disclosed.

---

### [2:15–2:30] Ops Dashboard — "Ask Aquashield" AI Agent
**Scene:** Ops dashboard at `/ops` (requires passcode).

**Expected (if agent is live):**
- Zone ranked list with action buttons
- "Ask Aquashield" input box
- AI plan returned with actions (pump dispatch, barricade, alert draft)
- Bilingual alert draft: English + Hindi

**Narration:**
> "For city operators, we have an AI agent built on AWS Bedrock and the
>  Strands Agents SDK. Ask it what to do about Minto Bridge right now.
>  It returns a ranked action plan with specific work orders —
>  dispatch a pump here, send a barricade crew there —
>  and drafts bilingual alerts for citizens.
>  Execute is disabled by default; a human must confirm before any action."

**Presenter note:** If agent is not live yet, show the mock response:
> "PLANNED: Ask Aquashield agent — returns action plan + bilingual alert drafts."

---

### [2:30–3:00] AWS Architecture Montage
**Scene:** AWS Console (Lambda, DynamoDB, Bedrock) — pre-opened tabs.

**Lambda tab:** Show `jalrakshak-api-prod` functions:
- `route-calculator` — OSRM routing + zone hazard detection
- `report-processor` — S3 trigger → Bedrock → DynamoDB
- `risk-ingest` — EventBridge 15min → Open-Meteo → risk-core → RiskSnapshots

**DynamoDB tab:** Show `Zones` table:
- Show Minto Bridge item with all static attributes
- Show `RiskSnapshots` with latest risk value
- Point out the 48h TTL on RiskSnapshots

**DynamoDB Reports tab:** Show active reports with TTL.

**Bedrock tab (if model is approved):** Show the ` Claude` model in use.

**Narration:**
> "Here's the AWS architecture behind the scenes.
>  Lambda functions handle every operation — routing, reports, risk computation.
>  DynamoDB stores our zones, risk snapshots with 48-hour TTL, and citizen reports
>  with 6-hour TTL to keep data fresh.
>  Open-Meteo provides the weather data every 15 minutes via EventBridge.
>  Amazon Bedrock powers the vision analysis and the ops AI agent.
>  All infrastructure is defined as code with AWS SAM."

**Presenter note:** Speak to each service for 5-8 seconds. Don't rush.
Show the actual Lambda invocations if CloudWatch is set up.

---

## Fallback Scripts

### If live data is stale or ingest hasn't run:
> "The zone data is [X] minutes old — our ingest Lambda updates every 15 minutes.
>  For the demo, we're showing simulated rainfall values."

### If OSRM routing fails:
> "The routing service is unavailable. The safe route would normally be fetched
>  from OSRM's public API with real polyline geometry.
>  See `services/api/src/route/handler.ts` for the implementation."

### If Bedrock is not approved yet:
> "Bedrock model access is pending approval. The agent returns mock responses.
>  Once approved, the same code path handles real multimodal vision analysis."

### If Amplify is not deployed yet:
> "The app is running locally on port 3000 connected to a mock API.
>  See `scripts/mock-api-server.ts` for the local development setup.
>  P2 is deploying to Amplify now."

---

## Post-Demo Checklist

- [ ] Reset rainfall slider to 0
- [ ] Close any open panels/modals
- [ ] Clear localStorage if demo was on personal device
- [ ] Confirm AWS Console tabs are still accessible
- [ ] Test the route endpoint on mobile viewport (judges may watch on phone)

---

## Files Behind This Demo

| File | Role |
|------|------|
| `data/zones.geojson` | 15 Delhi underpasses with verified/estimated attributes |
| `data/SOURCES.md` | Source documentation for all zone attributes |
| `packages/risk-core/src/index.ts` | Risk formula — only place it exists |
| `services/api/src/route/handler.ts` | OSRM routing + zone hazard detection |
| `services/api/src/route/__tests__/handler.test.ts` | 20 tests for routing module |
| `data/scripts/seed-zones.ts` | DynamoDB seed from zones.geojson |
| `infra/template.yaml` | AWS SAM (Lambda, DynamoDB, EventBridge, S3, SNS) |
| `services/agent/` | Strands agent + Bedrock (P3) |
| `apps/web/` | Next.js PWA frontend (P1) |

---

## Coordinate Verification Log

| Zone ID | Name (corrected) | Verified Coordinates | Source | Notes |
|---------|-----------------|---------------------|--------|-------|
| z_minto | Minto Bridge Underpass | (28.6328, 77.2197) | ROUTE-SNAPPED via OSRM + OSM; ToI corroborates | ~250m from Wikipedia coord (28.6336,77.2172); Delhi govt 169-site list |
| z_prahladpur | Pul Prahladpur Underpass | (28.5047, 77.2900) | ROUTE-SNAPPED via OSRM + OSM; HT corroborates | Historical hotspot; PWD removed from 2024 hotspot list |
| z_zakhira | Zakhira Underpass | (28.6657, 77.1535) | ROUTE-SNAPPED via OSRM + OSM; HT corroborates | PWD INR 4.36 crore, 60-day drain project Apr 2026 |
| z_ito | ITO Intersection | (28.6289, 77.2406) | ROUTE-SNAPPED via OSRM + OSM; HT corroborates | Surface intersection; PWD officially reported waterlogging at ITO (HT Jul 2026) |
| z_isbt_kashmere_gate | ISBT Kashmere Gate Underpass | (28.6680, 77.2410) | OSM proximity (ISBT area); NDTV/HT/NIE corroborate | CORRECTED: was "Daryaoganj" — coordinates match ISBT, not Daryaganj proper |
| z_nd_railway | New Delhi Railway Station Underpass | (28.6422, 77.2200) | OSM proximity (NDLS) | Plausible; specific underpass name loose but location accurate |
| z_azad_market | Azad Market Underpass | (28.6596, 77.2092) | OSM proximity; WION corroborates | Azad Market Railway Underpass + Ram Bagh Road confirmed by traffic police (WION Jul 2025) |
| z_pandav_nagar | Pandav Nagar Underpass | (28.6480, 77.2830) | OSM proximity; ToI corroborates | CORRECTED: was "Pratap Nagar Underpass" (NW Delhi) — ToI names "Pandav Nagar underpass" (E Delhi), ~8 km apart, NOT adjacent |
| z_rajinder_nagar | Rajinder Nagar Underpass | (28.6420, 77.1765) | OSM proximity; India Today/ABPLive corroborate | Old Rajinder Nagar repeatedly flooded Jul-Aug 2024 |
| z_mayur_vihar | Mayur Vihar Underpass | (28.5935, 77.2890) | OSM proximity; DownToEarth/Hindu/ET corroborate | Yamuna flooding of Mayur Vihar Phase 1 relief camps Aug-Sep 2025 |
| z_seelampur | Seelampur Underpass | (28.6720, 77.2710) | OSM proximity; ToI corroborates | VERIFIED corridor-level: PWD deluge complaints named Seelampur (ToI 10-Jul-2026); also YouTube "Flooded underpass near Old Yamuna Bridge" |
| z_shakur_basti | Shakur Basti Underpass | (28.6842, 77.1328) | OSM proximity | Shakurbasti railway underpass exists; specific waterlogging unconfirmed |
| z_mundka | Mundka Underpass | (28.6615, 77.0870) | OSM proximity; TimesNow/Jagran corroborate | CORRECTED: was "Rohtak Road Underpass (Narela)" — coords match Mundka, not Narela |
| z_pitampura | Pitampura Underpass | (28.7010, 77.1360) | OSM proximity; HT/DownToEarth corroborate | PWD confirms Pitampura waterlogging (HT Jul 2026) |
| z_model_town | Model Town Underpass | (28.7180, 77.1930) | OSM proximity | Plausible; area near GT Karnal Road floods; specific underpass unconfirmed |