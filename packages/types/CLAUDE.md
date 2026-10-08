# packages/types — API Contract (shared, P2 merges)

**Owner:** P2 (merges), all (propose changes)  
**Path:** `packages/types/src/index.ts`

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md, docs/SYNCHRONIZATION.md, and this file first.
You are working on the shared API contract. Any change requires a tiny PR + chat announcement.
```

## The Rule
`packages/types/src/index.ts` is the **single source of truth** for every data shape in the project.

- Frontend (P1) validates API responses against these schemas
- Backend (P2) validates every request/response
- AI vision (P3) validates output against VisionAnalysisSchema  
- AI agent (P3) mirrors AgentPlanSchema as a Pydantic model
- All mock JSON in `mocks/*.json` is validated against these schemas by `npm test`

## If you need to change a type

1. Tell the team chat **before** you start: "I need to add field X to ZoneSummary"
2. Make a tiny PR: only changes to `packages/types/src/index.ts` + matching mock JSON + `docs/CONTRACT.md`
3. CI must pass (`npm test` validates mocks against schemas)
4. **Everyone pulls immediately** after merge and updates their code

## Usage
```ts
import { ZoneListResponseSchema, type ZoneSummary, CreateReportRequestSchema } from "@aquashield/types";

// Frontend: parse API responses
const data = ZoneListResponseSchema.parse(await res.json());

// Backend: validate incoming requests
const req = CreateReportRequestSchema.parse(JSON.parse(event.body));

// Python (agent): mirror with Pydantic
# from packages.types import AgentPlanSchema  (or re-define as Pydantic)
```

## Verify
```bash
npm run validate:mocks   # all mocks must parse without errors
npm run typecheck         # no TypeScript errors
```