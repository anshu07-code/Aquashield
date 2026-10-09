# STATUS (update every few hours; one line per person)

Format: `[time] name — done: ... | now: ... | blocked: ...`

- [Thu] P1 —
- [Thu] P2 — [Fri 05:00 UTC] **BACKEND DEPLOYED!** All infra created in ap-southeast-2 (account region-restricted to Sydney). Done: 5 DynamoDB tables, S3 bucket (CORS+encryption), SNS topic, 6 Lambda functions, API Gateway HTTP API (11 routes, CORS, stage prod), EventBridge 15-min ingest, IAM role perms. Live URL: `https://i0ew0j1bdk.execute-api.ap-southeast-2.amazonaws.com/prod`. Tested OK: /health, /zones (4 seeded zones, live risk 14-30), /zones/{id}, /reports (photo→S3→vision→risk), /reports/presign, /route, /workorders, /agent/ask (created work order), /alerts/{id}/publish (SNS), ingest (stale 0). Fixed route matching (routeKey instead of rawPath). | now: document deploy for teammates; P1 needs NEXT_PUBLIC_API_URL + disable mocks | blocked: none
- [Fri 18:00 UTC] P2 — **Bedrock wired up.** CLI default region fixed to ap-southeast-2 (was ap-south-1, SCP-blocked). Set `BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0` (Claude Sonnet 4.5, vision-capable in Sydney) on deployed `aquashield-reports` + `aquashield-agent` lambdas; role already grants `bedrock:Invoke*`. Verified live e2e (report POST) degrades gracefully to `needs_review` when Bedrock is unavailable. `infra/template.yaml` + `.env.example` updated so SAM deploys keep the model ID. | now: re-test `/reports` Bedrock path once account verification completes | blocked: **Bedrock account verification pending** — `AccessDeniedException: Your account is currently being verified (usually < 2h)`; contact aws-verification@amazon.com if it lingers.
- [Thu] P3 —
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
