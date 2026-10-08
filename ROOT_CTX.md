# 🤖 FOR AI AGENTS — READ THIS FIRST

> **IMPORTANT:** This is a 4-person student hackathon project. You are helping one of 4 team members.
> Hackathon: WeMakeDevs x AWS Environmental Hacks · Track: Heat and Water · Oct 8-11, 2026.
> Judged from: public GitHub repo + <3 min YouTube demo video + writeup. Deadline NOT yet published.
> **The demo video must visibly show AWS.** A feature not shown in video does not exist.

---

## SESSION START RITUAL (do this every time)

```
1. Read this file (ROOT_CTX.md) — done ✅
2. Read docs/ONBOARDING.md — your role's full instructions
3. Run: git pull --rebase origin main && npm install && npm test
4. Read STATUS.md to see what others have done
5. Work ONLY in your assigned folders (section below)
```

---

## THE 4 PEOPLE & WHAT EACH OWNS

| Person | Role | Folder | Builds |
|--------|------|--------|--------|
| P1 | Frontend & UX | `apps/web/` | Next.js PWA, risk map, report flow, route UI, ops dashboard |
| P2 | Cloud & Backend | `services/api/`, `services/ingest/`, `infra/` | AWS SAM, Lambda, DynamoDB, S3, EventBridge, Amplify |
| P3 | AI Lead | `services/agent/`, `services/api/src/vision/` | Bedrock vision, trust score, Strands agent, bilingual alerts |
| P4 | Data & Risk | `packages/risk-core/`, `data/`, `services/api/src/route/` | Risk engine, zone data, routing module, demo script |

**Contract (shared, P2 merges):** `packages/types/src/index.ts` — single source of truth for all data shapes.
**Never change this file without a tiny PR + announce in team chat.**

---

## COORDINATION RULES (non-negotiable)

### Before EVERY push — run this:
```bash
git pull --rebase origin main
npm install
npm run pre-push-check
```

If pre-push check fails → **fix before pushing**. Never bypass it without telling the team.

### Per-person verify command (run before every push):
```bash
npm run verify:p1   # P1: type-checks apps/web
npm run verify:p2   # P2: validates mocks + SAM template
npm run verify:p3   # P3: type-checks AI modules
npm run verify:p4   # P4: runs risk-core tests
```

### If you need to change the API contract:
1. Announce in team chat: "I need to add field X to ZoneSummary"
2. Make a tiny PR: only `packages/types/src/index.ts` + matching mock JSON + `docs/CONTRACT.md`
3. CI must pass
4. Everyone pulls immediately after merge

### If you're blocked:
- P1 waiting for backend? `npm run mock:api` → serves all endpoints from `mocks/*.json` at localhost:3001
- P2/P3/P4 waiting on someone? Use mocks, skip to next independent task, tell team in chat

### If you get a merge conflict:
The schema in `packages/types/src/index.ts` decides. Fix code to match schema. Never patch another person's code to make yours work.

---

## THE PRODUCT: Aquashield

**Hyperlocal flood early-warning + safe routing for Delhi's underpasses.**
Loop: **Detect → Verify → Predict → Explain → Act**

- **Citizens (PWA):** risk map, 3-tap flood report with photo, safe route, alerts
- **City ops (/ops):** ranked hotspots, AI action plans, work orders, English+Hindi alerts

**Stack:** Next.js · MapLibre GL JS · AWS Amplify · API Gateway + Lambda · DynamoDB · S3 · EventBridge · SNS · Amazon Bedrock · Strands Agents SDK (Python) · AWS SAM · Open-Meteo · OSM/Overpass · Amazon Location Service

**Risk formula (lives ONLY in `packages/risk-core` — never re-implement):**
```
risk = 0.30*rainNow + 0.15*antecedent24h + 0.15*depression
     + 0.15*drainageDeficit + 0.10*history + 0.15*liveEvidence
if isUnderpass: risk = min(100, risk * 1.10)
```
Tiers: <30 SAFE · 30-54 WATCH · 55-74 HIGH · ≥75 CRITICAL

---

## DEMO PATH (what judges see in the video)

```
map (with real zones) → click zone (factor bars + ETA) → rainfall simulator slider
→ citizen report (3 taps, photo upload) → safe route (avoids flooded underpass)
→ ops dashboard + "Ask Aquashield" button → AWS console montage
```
**Protect this path above everything else.**

---

## FILES TO READ FOR YOUR ROLE

| If you're helping | Read |
|---|---|
| P1 (Frontend) | `docs/ONBOARDING.md` → P1 section |
| P2 (Cloud) | `docs/ONBOARDING.md` → P2 section |
| P3 (AI) | `docs/ONBOARDING.md` → P3 section |
| P4 (Data/Risk) | `docs/ONBOARDING.md` → P4 section |
| Any contract question | `packages/types/src/index.ts` (source of truth) |

---

## CURRENT PROJECT STATE

- ✅ `packages/types/src/index.ts` — full API contract (zod schemas)
- ✅ `packages/risk-core/src/index.ts` — risk engine (tested, 9/9 pass)
- ✅ `mocks/*.json` — mock data for all endpoints (validated against schemas)
- ✅ `scripts/pre-push-check.ts` — gatekeeper (blocks bad pushes)
- ✅ `scripts/mock-api-server.ts` — P1 can build without AWS
- ✅ `docs/SYNCHRONIZATION.md` — coordination rules
- ❌ `apps/web/` — empty (P1 starts now)
- ❌ `services/api/` — empty (P2 starts now)
- ❌ `services/agent/` — empty (P3 starts now)
- ❌ `services/ingest/` — empty (P2 starts now)
- ❌ `infra/template.yaml` — empty (P2 starts now)
- ❌ `data/zones.geojson` — empty (P4 starts now)

**Today is Thursday Oct 8.** The repo was just created. Nothing is built yet. This is the starting point.

---

## KEY REMINDERS

1. **npm test must pass before every push** — run it now: `npm test`
2. **Small PRs** — one feature at a time, 2-3 merges per day
3. **Deploy daily** — a deployed boring app beats a perfect local one
4. **Real data > simulated** — label anything seeded as "SIMULATION"
5. **AWS must appear in the demo video** — Lambda console, DynamoDB, Bedrock
6. **Never invent numbers** — if you don't have data, say "no data yet" not a made-up number

---

*Start now: `npm install && npm test` then `git checkout -b pX/your-feature` and start building.*