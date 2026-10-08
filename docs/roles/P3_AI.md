# P3 — AI LEAD (owns "the wow": vision triage, trust, agent, bilingual alerts, evaluation, blog)
Folders: `services/agent/` (Python Strands agent), vision module in `services/api/src/vision/`, `data/eval/`.

## Start every AI session with
> Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md and docs/roles/P3_AI.md. I am P3. Vision output must validate against VisionAnalysisSchema; agent output must validate against AgentPlanSchema (mirror it as a Pydantic model and test against mocks/agent-plan.json). The agent never invents numbers; all facts come from tools. Bedrock model ID comes from env var BEDROCK_MODEL_ID.

## FIRST HOUR (blocking for the team)
Prove one Bedrock multimodal call works from a Lambda in your chosen region with a real photo. Report any access/region/inference-profile error to the team lead immediately.

## Build order
1. **Vision triage module (TS):** input image bytes from S3 -> Bedrock multimodal -> JSON only matching `VisionAnalysisSchema` (isRoadScene, floodedRoad, waterDepthTier, blockedDrain, debrisOrWasteObstruction, vehiclesStranded, confidence, rejectReason, explanation). Validate with zod, retry once on malformed output, reject non-road images (`isRoadScene=false` -> status `rejected`), handle timeouts (-> `needs_review`). Keep prompts in `services/api/src/vision/prompts/` with version comments.
2. **Trust score function** per `docs/RISK_ENGINE.md` (corroboration within 150 m / 30 min, rain consistency, age decay) + unit tests.
3. **Strands agent (Python Lambda):** tools `get_zone_risk`, `get_forecast`, `get_nearby_reports`, `get_nearby_zones`, `plan_safe_route`, `create_work_order`, `draft_alert`, `publish_alert`. Tools call our own API/DynamoDB. System prompt: use tools for every number, never guess, be concise, output only the schema. `execute=false` -> no side effects. `execute=true` -> may create work orders and alert drafts. Return `toolsUsed`.
4. **Bilingual alerts:** every plan includes `alertDraft.en` and `alertDraft.hi` (simple, actionable, <160 chars each).
5. **Latency:** target <8 s for vision, <20 s for agent (API Gateway ~30 s cap). Fast model, max 4 tool calls, concise prompts.
6. **Evaluation set:** 20-30 labelled images (your own photos or properly licensed ones; keep credits in `data/eval/CREDITS.md`). Script prints accuracy + confusion matrix; paste into README. Honest numbers beat fake perfection.
7. **Blog (AirPods prize):** after the app works, write the AWS Builder Center post: problem, architecture, what fought back, evaluation numbers, AI coding tools used. Publish and link it in the submission.

## Don'ts
No hard-coded model IDs. No unvalidated model output reaching the UI. No agent side effects without `execute=true`.

## Done when
Real flooded-road photo -> structured analysis <8 s; "Ask JalRakshak" -> grounded plan <20 s, with tools listed; rejects a selfie/cat photo gracefully.
