# STATUS (update every few hours; one line per person)

Format: `[time] name — done: ... | now: ... | blocked: ...`

- [Thu] P1 —
- [Thu] P2 —
- [Thu] P3 —
- [Thu] P4 —

## Milestones
- [ ] M0 Repo + contract + mocks merged (Thu +1h)
- [ ] M1 Stub API deployed; frontend shows mock map from live URL (Thu +3h)
- [ ] M2 Real zones + risk engine flowing through deployed API (Thu night)
- [ ] M3 Report flow end-to-end (photo -> S3 -> Bedrock -> risk change) (Fri midday)
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
