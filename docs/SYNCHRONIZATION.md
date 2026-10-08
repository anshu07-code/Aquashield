# SYNCHRONIZATION — How 4 People Build Without Collisions

> Read this before EVERY git push and EVERY new AI session.  
> Short version: **contract first, small PRs, verify before push, announce changes.**

---

## The Core Rule: Contract First

`packages/types/src/index.ts` is the **single source of truth** for every data shape.
- P2 builds the API → validates every request/response with these schemas
- P1 builds the UI → parses every API response with these schemas  
- P3's vision output → validates against `VisionAnalysisSchema`
- P3's agent output → validates against `AgentPlanSchema`
- P4's zone data → validates against `ZoneSummary` fields
- All mock JSON → validated by `npm run validate:mocks`

**If something doesn't match the contract, fix the code — not the contract.**
**If the contract is wrong, change it via a tiny PR + announce in chat.**

---

## Before You Start (Every Session)

```
git pull --rebase origin main
npm install
npm run install-hooks   # only once per machine
npm test
```

If tests fail: **fix them before starting**. Ask in chat if you're unsure why.

---

## Before You Push (Every Time)

```
npm run pre-push-check
```

This validates mocks, runs risk-core tests, and type-checks.  
**If it fails: fix it before pushing.** Don't bypass without telling the team.

---

## After You Finish a Feature

1. Run your per-person verify: `npm run verify:p1` (or p2/p3/p4)
2. Update `STATUS.md` with what you did
3. Push to your branch
4. Open a PR into `main` — keep it **small** (one feature max)
5. Another person reviews in 2 minutes — if CI is green, merge
6. Announce in chat: "merged X, now working on Y"

---

## When You Need to Change the Contract

If you need to add/change a field in `packages/types/src/index.ts`:

1. Tell the team chat **before** you start: "I need to add field X to ZoneSummary"
2. Make a tiny PR: only changes to `packages/types/src/index.ts` + matching mock JSON + `docs/CONTRACT.md`
3. CI must pass
4. **Everyone pulls immediately** after merge — update your local code to match

---

## When You're Blocked on Someone Else's Work

| Blocked on | What to do |
|---|---|
| P1 waiting for P2's API | Use `npm run mock:api` → builds against localhost:3001 |
| P2 waiting for P4's zone data | Use `mocks/zones.json` (already exists) |
| P3 waiting for P2's vision module path | Ask P2 to create `services/api/src/vision/index.ts` stub |
| P4 waiting for zone geojson | Start with 4 mock zones, expand later |
| Anyone waiting for AWS credentials | Use mocks, deploy when credentials ready |

**Never wait.** If you're blocked, build against mocks or skip to the next independent task.

---

## Per-Person Daily Commands

### P1 (Frontend)
```bash
# Start building
npm run mock:api          # start local mock server (terminal 1)
cd apps/web && npm run dev  # start Next.js (terminal 2)

# Before pushing
npm run verify:p1

# Switch to real API later
# Edit apps/web/.env.local: NEXT_PUBLIC_API_URL=https://your-api-id.execute-api.region.amazonaws.com
```

### P2 (Cloud/Backend)
```bash
# After a code change
npm run validate:mocks

# Before SAM deploy
npm run verify:p2

# Deploy
sam build && sam deploy --guided   # first time
sam build && sam deploy            # subsequent
```

### P3 (AI)
```bash
# Before pushing
npm run verify:p3

# Test vision module
npx tsx -e "import { validateVision } from './services/api/src/vision/index.ts'; console.log('OK')"
```

### P4 (Data/Risk)
```bash
# After any risk-core change
npm run test    # must always pass

# Before pushing
npm run verify:p4

# Validate zone data
node scripts/validate-zones.js   # (create this if zone pipeline exists)
```

---

## If You Get a Merge Conflict

1. `git checkout your-branch`
2. `git fetch origin && git rebase origin/main`
3. Fix conflicts in the file(s) listed
4. `git add . && git rebase --continue`
5. `npm test` — must pass
6. Force-push: `git push --force-with-lease` (tell chat you're doing this)

**The schema in `packages/types` decides who is right.**  
If the schema is ambiguous, fix the schema by tiny PR first.

---

## Git Branch Map

```
main  ←── P2 merges contract PRs here first
  │
  ├── p1/report-flow      (P1: frontend)
  ├── p1/safe-route       (P1: routing UI)
  ├── p1/ops-dashboard    (P1: ops dashboard)
  ├── p2/sam-skeleton     (P2: AWS SAM infra)
  ├── p2/ingest-lambda    (P2: EventBridge ingest)
  ├── p2/api-lambdas      (P2: REST endpoints)
  ├── p3/vision-module     (P3: Bedrock vision)
  ├── p3/strands-agent    (P3: Strands agent)
  ├── p4/zones-data       (P4: Overpass zone pipeline)
  └── p4/route-module     (P4: routing logic)
```

---

## How to Know What to Build (Priority)

See `docs/PLAYBOOK.md` — P0 = ship it, P1 = nice to have, P2 = stretch.

The demo path (what judges see in the video):
1. Risk map with zones
2. Click zone → factor bars + ETA
3. Rainfall simulator slider
4. Citizen report (3 taps, photo upload)
5. Safe route recommendation
6. Ops dashboard + Ask AI button

**Build these first. Everything else is secondary.**

---

## If Something Breaks After a Merge

1. Revert the merge immediately: `git revert -m 1 <merge-commit-sha>`
2. Tell the team in chat
3. Investigate, fix, re-merge as a small PR
4. Never leave `main` broken — it's the base for everyone

---

## Quick Reference Card

| Need | Command / Action |
|---|---|
| Start session | `git pull --rebase && npm install && npm test` |
| Local mock API | `npm run mock:api` → http://localhost:3001 |
| Check before push | `npm run pre-push-check` |
| Verify my piece | `npm run verify:p1/p2/p3/p4` |
| Change contract | Tiny PR → announce → everyone pulls |
| Merge conflict | Schema decides → rebase → test → force-push with note |
| Blocked | Use mocks → skip → tell team in chat |
| Done with feature | PR → review → merge → announce in chat |
| Status update | Edit `STATUS.md` with `[Thu HH:MM] P# — done X | now Y | blocked Z` |

---

*This file is updated after each hackathon day. Last updated: Thu Oct 8 2026.*