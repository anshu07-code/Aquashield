# P3 — Vision Module

**Owner:** P3
**Path:** `services/api/src/vision/`

## What you're building
- Bedrock multimodal vision triage (S3 bytes → Bedrock → VisionAnalysis)
- Trust score function with corroboration, rain consistency, and age decay

## Key files
- `index.ts` — main export: `analyzeImage()` function
- `bedrock.ts` — Bedrock client with timeout, retry, mock support
- `trust.ts` — trust score function (pure, no I/O)
- `trust.test.ts` — unit tests
- `prompts/vision-v1.ts` — vision prompt (update version comment on changes)

## Environment variables
| Variable | Required | Description |
|---|---|---|
| `BEDROCK_MODEL_ID` | Yes | Model ID (e.g. `anthropic.claude-sonnet-4-20250514`) |
| `AWS_REGION` | No | Defaults to `us-east-1` |
| `MOCK_BEDROCK` | No | Set `1` for mock responses in dev/CI |

## How P2 calls this module
```ts
// From P2's reports Lambda:
import { analyzeImage } from './vision/index.js';

const analysis = await analyzeImage(imageBytes, contentType);
// Returns VisionAnalysis matching VisionAnalysisSchema
```

## Important rules
- Never hard-code model IDs — use `BEDROCK_MODEL_ID`
- Never let unvalidated output reach the UI
- Non-road scene → `isRoadScene=false` + `status: "rejected"`
- Timeout/malformed → `needs_review` status
- `MOCK_BEDROCK=1` for local dev without AWS

## Testing
```bash
MOCK_BEDROCK=1 npx tsx --test services/api/src/vision/trust.test.ts
```
