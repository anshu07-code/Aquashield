# AGENTS.md — READ THIS FIRST (every human and every AI coding agent)

You are helping a 4-person student team build **JalRakshak** for the WeMakeDevs x AWS
**Environmental Hacks** hackathon (Track: Heat and Water), Oct 8-11, 2026.
The project is judged ONLY from: a public GitHub repo + a <3 min YouTube demo video + a short writeup.
Judging: Idea & Impact · Built on AWS · Design & Usability · Execution (working > ambitious) · Demo video.
**The demo video must visibly show AWS.** A feature not shown in the video does not exist.

## 1. Product in one paragraph
JalRakshak is a hyperlocal urban flood early-warning and safe-routing system for Delhi, focused on
**underpass waterlogging**. Loop: **Detect -> Verify -> Predict -> Explain -> Act**.
- Citizens (PWA): risk map, 3-tap flood report with photo, safe route, alerts.
- City ops (/ops): ranked hotspots, AI action plans, work orders, English+Hindi alert drafts.

## 2. Session start ritual (do this every new AI session)
1. Read this file, then `docs/CONTRACT.md`, `docs/RISK_ENGINE.md`, then YOUR role file in `docs/roles/`. For full feature priorities (P0/P1/P2), judging map and cut list, see `docs/PLAYBOOK.md`.
2. Run `git pull` and `npm install`, then `npm test` (must pass before you start).
3. Read `STATUS.md` to see what others have done/blocked.
4. Work ONLY inside the folders you own (section 4).

## 3. Stack (do not change without team lead approval)
Next.js + TypeScript + Tailwind (PWA) · MapLibre GL JS · AWS Amplify Hosting ·
API Gateway HTTP API + Lambda (Node.js TS) · DynamoDB on-demand + TTL · S3 presigned uploads ·
EventBridge Scheduler · SNS · Amazon Bedrock (current Claude multimodal model; ID from env var `BEDROCK_MODEL_ID`,
NEVER hard-coded) · Strands Agents SDK (Python Lambda) · AWS SAM (IaC) · Open-Meteo (forecast + elevation) ·
OSM/Overpass (precomputed offline) · Amazon Location Service or OSRM (route alternatives) · CloudWatch.
Shared code: `packages/types` (API contract, zod) and `packages/risk-core` (risk engine).

## 4. Ownership map (edit only your own area)
| Area | Owner | Path |
|---|---|---|
| Frontend + PWA + Ops UI | **P1** | `apps/web/` |
| Cloud + API + ingest + deploy | **P2** | `services/api/`, `services/ingest/`, `infra/` |
| AI: vision, trust score, agent, alerts, eval | **P3** | `services/agent/`, `services/api/src/vision/` (module), `data/eval/` |
| Data, risk engine, routing, demo script | **P4** | `packages/risk-core/`, `data/`, `services/api/src/route/` (module), `docs/DEMO.md` |
| Contract (shared) | **Team lead (P2)** merges; anyone proposes | `packages/types/`, `mocks/`, `docs/CONTRACT.md` |

Need a change in someone else's area? Ask them in chat or open a small PR into their area. Never silently edit it.

## 5. Non-negotiable rules
1. **Contract first.** `packages/types/src/index.ts` is the single source of truth. Any endpoint/shape change =
   small PR touching types + mocks + `docs/CONTRACT.md`, announced in chat BEFORE merge. `npm test` must pass.
2. **Simplicity and reliability over features.** One feature that works beats five that almost do.
3. **Real data wherever possible.** Anything simulated/seeded must be labelled in UI and README
   ("SIMULATION", "seeded from <source>"). Never invent statistics.
4. **Risk = explainable weighted index 0-100 (NOT a probability).** Always return the factor breakdown.
   Logic lives ONLY in `packages/risk-core`; never re-implement the formula elsewhere.
5. **The AI agent never invents numbers.** Facts come from tools. Outputs are validated structured JSON.
   Creating work orders/publishing alerts requires `execute=true` set by a human click in the UI.
6. **Security basics:** no secrets in git (use `.env.local`, SSM/env vars); least-privilege IAM;
   throttle write endpoints; private S3 (presigned only); upload size/type limits; validate all input with zod.
7. **Don't call Overpass/Open-Meteo/OSRM from the browser.** Precompute or cache through the backend.
8. **Licences:** anything we didn't write needs attribution + a licence in `README.md` (data, images, libraries).
9. **Every UI path has loading, error and empty states.**
10. **Deploy daily.** A deployed boring app beats a perfect local one.

## 6. Git workflow
- Branch from `main`: `p1/report-flow`, `p2/ingest-lambda`, `p3/vision`, `p4/zones-data`.
- Small PRs, merged to `main` 2-3 times per day minimum. Never sit on a branch for hours.
- Commit format: `feat(web): ...`, `fix(api): ...`, `chore(infra): ...`, `docs: ...`, `test(risk): ...`.
- CI runs `npm test`. Don't merge red.
- Use your OWN GitHub account and `git config user.email` linked to it, so contributions are attributed.
- Rebase/pull before pushing: `git pull --rebase origin main`.

## 7. Definition of done (any task)
Runs on the deployed dev stack (or mock mode for UI), has no console errors, handles failure, and is
noted in `STATUS.md`. If you changed behaviour others depend on, say so in chat.

## 8. How to talk to the human
Work in small steps. After each step say: (a) what you changed, (b) the exact command to verify,
(c) what could break. Ask before adding dependencies, changing the stack, or touching others' folders.
If something in these docs is wrong or missing, say so and propose a fix instead of guessing.
