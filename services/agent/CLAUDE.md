# P3 — AI LEAD

**Owner:** P3  
**Paths:** `services/agent/`, `services/api/src/vision/`, `data/eval/`

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md, docs/SYNCHRONIZATION.md, and this file first.
You are P3. Vision output validates against VisionAnalysisSchema; agent output validates against AgentPlanSchema.
The agent NEVER invents numbers — all facts come from tools.
```

## What you're building
- Bedrock vision triage module (TypeScript)
- Trust score function with corroboration/rain-consistency/age-decay
- Strands agent (Python Lambda) with 8 tools
- Bilingual alert drafts (EN + HI)
- Image evaluation set + accuracy metrics

## Critical rules

### NEVER do these
- ❌ Don't hard-code Bedrock model IDs — use `process.env.BEDROCK_MODEL_ID`
- ❌ Don't let unvalidated model output reach the UI
- ❌ Don't create work orders or publish alerts without `execute=true` flag
- ❌ Don't let the agent guess numbers — every fact must come from a tool call
- ❌ Don't change `packages/types/src/index.ts` without announcing in chat

### ALWAYS do these
- ✅ Vision output must validate against `VisionAnalysisSchema` (zod)
- ✅ Agent output must validate against `AgentPlanSchema` (Pydantic mirror)
- ✅ Prompt must force JSON-only output from Bedrock
- ✅ Retry once on malformed JSON, then mark `needs_review`
- ✅ Reject non-road images gracefully (`isRoadScene=false` → `status: "rejected"`)

## FIRST HOUR (critical path — everyone is waiting on you)
```
Test one Bedrock multimodal call from Lambda in your chosen region with a real photo.
Report any access/region/inference-profile error to the team chat IMMEDIATELY.
This is the #1 hidden blocker for the whole team.
```

## Build order
1. **Vision triage module** (services/api/src/vision/):
   - Input: S3 image bytes → Bedrock multimodal → JSON only
   - Schema: `{isRoadScene, floodedRoad, waterDepthTier, blockedDrain, debrisOrWasteObstruction, vehiclesStranded, confidence, rejectReason, explanation}`
   - Validate with zod from `@jalrakshak/types`
   - Retry once on malformed output, then `needs_review`
   - Prompts in `services/api/src/vision/prompts/` with version comments

2. **Trust score function**:
   - `trust = visionConfidence × corroboration × rainConsistency × ageDecay`
   - corroboration: reports within 150m/30min (cap 1)
   - rainConsistency: down-weight if forecast is dry
   - ageDecay: linear to 0 over 6h TTL
   - Unit tests required

3. **Strands agent** (Python Lambda, services/agent/):
   - Tools: get_zone_risk, get_forecast, get_nearby_reports, get_nearby_zones, plan_safe_route, create_work_order, draft_alert, publish_alert
   - All tools call our own API/DynamoDB (NOT Bedrock directly for data)
   - System prompt: use tools for every number, never guess, be concise
   - `execute=false` → plan only. `execute=true` → may create work orders/alerts
   - Output must match `AgentPlanSchema`
   - Latency target: <20s

4. **Bilingual alerts**: every plan includes `alertDraft.en` and `alertDraft.hi` (<160 chars)

5. **Evaluation set** (data/eval/):
   - 20-30 labelled images (your own or properly licensed, credits in data/eval/CREDITS.md)
   - Script runs images through vision module → prints accuracy + confusion matrix
   - Honest numbers in README (not inflated)

6. **Builder Center blog** (AirPods prize): after the app works

## Verify before push
```bash
npm run verify:p3
# Also: run vision module against 3 test images and confirm valid JSON output
```

## If you're blocked
- P2's vision module path not ready? Ask P2 to create stub at `services/api/src/vision/index.ts`
- No Bedrock access yet? Write the module with mocked output, test when access comes
- Contract unclear? Check `packages/types/src/index.ts` VisionAnalysisSchema

## Dependencies on others
- P2: provides `services/api/src/vision/index.ts` stub, S3 bucket, Lambda runtime
- P4: zone data for corroboration (reports near zone) — ask P4 to expose via `/zones/{id}`