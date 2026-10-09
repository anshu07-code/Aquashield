# DEMO.md — JalRakshak 3-Minute Demo Script

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
| 0:20-0:50 | Live map, real forecast, click an underpass | "Aquashield scores waterlogging risk street by street. Not a black box: here's why it's 61." Show factor bars |
| 0:50-1:15 | Rainfall simulator 30 -> 60 -> 80 | "What if rain doubles? Same engine as the backend." Show SIMULATION label |
| 1:15-1:50 | Citizen uploads photo | "3 taps. Amazon Bedrock verifies the photo, rejects fakes, scores trust. Risk jumps." (show old -> new) |
| 1:50-2:15 | Safe route | "The fastest route crosses a critical underpass. Aquashield's route avoids it: +6 minutes." |
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
| Origin (demo route) | Near Minto Bridge (Gole Market area) | `[28.6380, 77.2140]` |
| Destination (demo route) | ITO | `[28.6289, 77.2406]` |
| Rainfall slider value | `60 mm/hr` | SIMULATION |
| Simulation label | `⚠️ SIMULATION — seeded from estimates` | Always show this badge |

---

## Demo Script (3:00 total)

### [0:00–0:15] Title & Map Introduction
**Scene:** Full-screen risk map of Delhi, zone markers colored by tier.

**Narration:**
> "JalRakshak — hyperlocal urban flood early warning for Delhi's underpasses.
>  Every marker is a real location with live risk computed from rainfall, drainage,
>  and citizen reports. This is not a mock — these are real coordinates, seeded
>  from OSM, municipal reports, and SRTM elevation data."

**Action:** Pan/zoom the map to show zone distribution. Point out a CRITICAL zone
(Minto Bridge, red + pulsing).

**Presenter note:** If the map is slow, zoom in on Central Delhi to show 3-4 zones.

---

### [0:15–0:45] Zone Risk Inspection
**Scene:** Click Minto Bridge marker → zone detail panel slides in.

**Expected UI:**
- Risk score: **82** (SIMULATION) — CRITICAL
- Tier badge: 🔴 CRITICAL
- ETA to critical: **0 min** (already critical)
- Factor breakdown bars: rainNow 92%, depression 75%, drainageDeficit 82%, history 60%
- Top reasons: "Heavy rainfall now", "Low-lying / bowl-shaped location", "Poor drainage nearby"

**Narration:**
> "Minto Bridge Underpass. Risk 82 — CRITICAL.
>  The breakdown shows why: deep underpass bowl, poor drainage, and heavy rainfall
>  have pushed it past the critical threshold. Notice the ETA is zero — it's already
>  flooded. All these numbers come from the risk engine in `packages/risk-core`."

**Action:** Click through the factor bars. Show the **⚠️ SIMULATION** badge.

**Presenter note:** If live data is stale, show the "stale data" badge and say:
> "This data is 50 minutes old — the ingest Lambda updates every 15 minutes."

---

### [0:45–1:15] Rainfall Simulator
**Scene:** Rainfall simulator slider in zone detail panel.

**Action:** Drag slider to `60 mm/hr`.

**Expected change:**
- Risk: 82 → **95** (SIMULATION)
- Tier: CRITICAL (no change, already critical)
- Factor bars update: rainNow increases to ~100%

**Narration:**
> "Now let's simulate 60 millimeters per hour — a record-breaking deluge.
>  Watch the rainNow factor jump. Risk climbs from 82 to 95.
>  This is running client-side using the exact same risk engine as the backend.
>  The formula never changes between simulator and production."

**Presenter note:** Reset the slider to 0 after demo. Say:
> "Resetting to baseline — this was a simulation."

---

### [1:15–1:45] Citizen Report Submission
**Scene:** Report flow — 3 taps.

**Expected flow:**
1. Tap **"Report flooding"** button
2. Camera opens → take photo of standing water (or upload)
3. Select type: `flooding`
4. Submit → loading state → result card:
   - AI analysis: "Knee-deep water with debris blocking drain"
   - Confidence: 91%
   - Trust: 0.82
   - Status: `verified` badge
   - Previous risk → updated risk

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
**Scene:** Route panel — origin: near Minto Bridge (Gole Market), destination: ITO.

**Expected routes (from `services/api/src/route/` handler — OSRM):**
| Route | Duration | Hazards | Recommended |
|-------|----------|---------|-------------|
| Fastest (`route_1`) | 15 min | Minto Bridge 🔴 CRITICAL | ❌ unsafe |
| Safe (`route_2`) | 22 min | ITO 🟡 WATCH (destination only) | ✅ recommended |

**Route polyline on map:** Both routes drawn. Recommended route in green, fastest in grey.

**Narration:**
> "Requesting a safe route from near Minto Bridge to ITO.
>  OSRM returns two alternatives. The fastest route? It goes right through
>  the Minto Bridge underpass — marked CRITICAL. We detect this by checking
>  every segment of the polyline against our zone database.
>  The safe route adds 7 minutes but avoids the flooded underpass completely.
>  This is real OSRM routing with real zone hazard detection — not a mock."

**Action:** Click the safe route to highlight it on map. Show the summary:
> "Avoids 1 flooded underpass — +7 min"

---

### [2:15–2:30] Ops Dashboard — "Ask Aquashield" AI Agent
**Scene:** Ops dashboard at `/ops` (requires passcode).

**Expected (if agent is live):**
- Zone ranked list with action buttons
- "Ask JalRakshak" input box
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
> "PLANNED: Ask JalRakshak agent — returns action plan + bilingual alert drafts."

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
| z_daryaoganj | ISBT Kashmere Gate Underpass | (28.6680, 77.2410) | OSM proximity (ISBT area); NDTV/HT/NIE corroborate | CORRECTED: was "Daryaoganj" — coordinates match ISBT, not Daryaganj proper |
| z_nd_railway | New Delhi Railway Station Underpass | (28.6422, 77.2200) | OSM proximity (NDLS) | Plausible; specific underpass name loose but location accurate |
| z_azad_market | Azad Market Underpass | (28.6596, 77.2092) | OSM proximity; WION corroborates | Azad Market Railway Underpass + Ram Bagh Road confirmed by traffic police (WION Jul 2025) |
| z_pratap_nagar | Pandav Nagar Underpass | (28.6480, 77.2830) | OSM proximity; ToI corroborates | CORRECTED: was "Pratap Nagar Underpass" (NW Delhi) — ToI names "Pandav Nagar underpass" (E Delhi), ~8 km apart, NOT adjacent |
| z_rajinder_nagar | Rajinder Nagar Underpass | (28.6420, 77.1765) | OSM proximity; India Today/ABPLive corroborate | Old Rajinder Nagar repeatedly flooded Jul-Aug 2024 |
| z_mayur_vihar | Mayur Vihar Underpass | (28.5935, 77.2890) | OSM proximity; DownToEarth/Hindu/ET corroborate | Yamuna flooding of Mayur Vihar Phase 1 relief camps Aug-Sep 2025 |
| z_seelampur | Seelampur Underpass | (28.6720, 77.2710) | OSM proximity; YouTube corroborates | PARTIALLY VERIFIED: video "Flooded underpass near Old Yamuna Bridge" (~1 km NE) — corridor evidence, no named underpass |
| z_shakur_basti | Shakur Basti Underpass | (28.6842, 77.1328) | OSM proximity | Shakurbasti railway underpass exists; specific waterlogging unconfirmed |
| z_rohtak_road | Mundka Underpass | (28.6615, 77.0870) | OSM proximity; TimesNow/Jagran corroborate | CORRECTED: was "Rohtak Road Underpass (Narela)" — coords match Mundka, not Narela |
| z_pitampura | Pitampura Underpass | (28.7010, 77.1360) | OSM proximity; HT/DownToEarth corroborate | PWD confirms Pitampura waterlogging (HT Jul 2026) |
| z_model_town | Model Town Underpass | (28.7180, 77.1930) | OSM proximity | Plausible; area near GT Karnal Road floods; specific underpass unconfirmed |