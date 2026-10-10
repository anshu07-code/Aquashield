# STATUS (update every few hours; one line per person)

Format: `[time] name — done: ... | now: ... | blocked: ...`

- [Fri] P1 — done: full citizen PWA + ops UI in apps/web (Next 15 + MapLibre dark map, zone sheet, rainfall simulator using @aquashield/risk-core, 3-tap report flow w/ presign+PUT+vision result, safe-route panel, EN/HI, PWA manifest+SW, /ops passcode gate + hotspots + Ask JalRakshak agent panel + work-order board). tsc --noEmit clean, next build clean, verified end-to-end against mock API in a headless browser: 0 console errors, no overflow at 1440px or 390px. Also added PUT /upload + PUT CORS to scripts/mock-api-server.ts (presigned-upload path was blocked by CORS). After rebasing onto main, renamed workspace imports from @jalrakshak/* to @aquashield/* to match packages/types and packages/risk-core | now: switch to the live API URL, adopt the new POST /workorders + POST /alerts endpoints in the ops UI, UI polish + demo script; record demo path | blocked: root `npm run typecheck` is RED for everyone — 23 pre-existing strict errors in scripts/install-hooks.ts, scripts/mock-api-server.ts, scripts/pre-push-check.ts (P2's files, not mine); apps/web is not covered by tsconfig.base so verify:p1 never checked the frontend — I verified it separately with `npm run typecheck --workspace @aquashield/web`
- [Thu] P2 — [Fri 05:00 UTC] **BACKEND DEPLOYED!** All infra created in ap-southeast-2 (account region-restricted to Sydney). Done: 5 DynamoDB tables, S3 bucket (CORS+encryption), SNS topic, 6 Lambda functions, API Gateway HTTP API (11 routes, CORS, stage prod), EventBridge 15-min ingest, IAM role perms. Live URL: `https://i0ew0j1bdk.execute-api.ap-southeast-2.amazonaws.com/prod`. Tested OK: /health, /zones (4 seeded zones, live risk 14-30), /zones/{id}, /reports (photo→S3→vision→risk), /reports/presign, /route, /workorders, /agent/ask (created work order), /alerts/{id}/publish (SNS), ingest (stale 0). Fixed route matching (routeKey instead of rawPath). | now: document deploy for teammates; P1 needs NEXT_PUBLIC_API_URL + disable mocks | blocked: none
- [Fri 18:00 UTC] P2 — **Bedrock wired up (free tier).** CLI default region fixed to ap-southeast-2 (was ap-south-1, SCP-blocked). Set `BEDROCK_MODEL_ID=amazon.nova-lite-v1:0` (Amazon Nova Lite — cheapest multimodal, $0.06/$0.24 per MTok, effectively free under account's $200 Bedrock credits) on deployed `aquashield-reports` + `aquashield-agent` lambdas; role already grants `bedrock:Invoke*`. Verified live e2e (report POST) degrades gracefully to `needs_review` when Bedrock is unavailable. `infra/template.yaml` + `.env.example` updated so SAM deploys keep the model ID. | now: re-test `/reports` Bedrock path once account verification completes | blocked: **Bedrock account verification pending** — `AccessDeniedException: Your account is currently being verified (usually < 2h)`; contact aws-verification@amazon.com if it lingers.
- [Sat 01:30 UTC] P2 — **Added missing ops endpoints** `POST /workorders` + `POST /alerts` so P3's Strands agent and P1's ops UI can act end-to-end (previously only GET/PATCH + publish existed). Contract changed (types + CONTRACT.md + template.yaml + mock server + mocks validated). Added `CreateWorkOrderRequestSchema` + `CreateAlertRequestSchema` to `packages/types`; ops handler routeKeys; SAM events; mock server POST routes. Deployed: uploaded new `aquashield-ops` code + created routes on live API (POST /workorders + POST /alerts). **Verified live** e2e: create WO (201) → listed; draft alert (201) → publish → SNS. Aligned P3's `api_client.draft_alert`/tools to send `text`. Note: fixed `mocks/` validate + trust 16/16 + risk 9/9 + Python agent all-pass + lambda build OK on `fix/backend-green-merge`. | now: Bedrock re-test; P1 ops UI can use new endpoints | blocked: Bedrock account verification (~<2h) for vision path.
- [Thu] P3 — [Sat] done: vision triage module + trust score (16/16 tests) + Strands agent (8 tools, bilingual EN/HI alerts) all merged, agent live-verified by P2; added 32-image eval set + labels; built vision-cli.ts bridge + repointed run_eval.py to it, pipeline verified end-to-end | now: real Bedrock eval run blocked locally (AWS creds invalid/verification pending); once creds exist run `python data/eval/run_eval.py` for honest numbers | blocked: Bedrock account verification per P2
- [Thu] P4 —

## Milestones
- [ ] M0 Repo + contract + mocks merged (Thu +1h)
- [x] M1 Stub API deployed; frontend shows mock map from live URL (Fri — backend live URL ready for P1)
- [x] M2 Real zones + risk engine flowing through deployed API (Fri — 4 zones seeded, live risk 14-30 via Open-Meteo ingest)
- [ ] M3 Report flow end-to-end (photo -> S3 -> Bedrock -> risk change) (Fri midday) — API flow works; **waiting on Bedrock account verification** (vision currently falls back to needs_review; auto-activates when verification completes)
- [ ] M4 All P0 working on deployed URL (Fri night)
- [ ] M5 Feature freeze (Sat 6 PM)
- [ ] M6 Video recorded, uploaded, tested signed-out (Sun morning)
- [ ] M7 Submitted (Sun morning, before deadline)

## Coordination infrastructure (setup Thu)
- [x] `scripts/pre-push-check.ts` — gates every `git push`
- [x] `scripts/mock-api-server.ts` — P1's local API (no AWS needed to start)
- [x] `scripts/install-hooks.ts` — auto-installs pre-push hook
- [x] `scripts/validate-mocks.ts` — validates all mock JSON against zod schemas
- [x] `docs/SYNCHRONIZATION.md` — living coordination rules
- [x] Per-folder `CLAUDE.md` files — guide every AI agent working in any folder
- [x] `npm run verify:p1/p2/p3/p4` — one-command per-person verification
- [x] `npm test` ✅ all 9 risk-core tests pass; all 6 mock files validate