# packages/risk-core — Flood Risk Engine

**Owner:** P4  
**Path:** `packages/risk-core/src/index.ts`

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md, docs/SYNCHRONIZATION.md, and this file first.
You are P4 (or a teammate working on risk-core). packages/risk-core is owned by P4.
```

## What it does
Pure TypeScript functions for computing flood risk (0-100) from zone static attributes + live inputs.
Used by BOTH the backend (Lambda) AND the browser (rainfall simulator) — they must always match.

## Risk formula
```
risk = 0.30*rainNow + 0.15*antecedent24h + 0.15*depression
     + 0.15*drainageDeficit + 0.10*history + 0.15*liveEvidence
if isUnderpass: risk = min(100, risk * 1.10)
```

Tiers: SAFE <30 · WATCH 30-54 · HIGH 55-74 · CRITICAL >=75.

## Usage
```ts
import { computeRisk, computeEta, tierFor, WEIGHTS, TIER_THRESHOLDS } from "@aquashield/risk-core";
import type { ZoneStatic, LiveInputs } from "@aquashield/risk-core";

const zone: ZoneStatic = { isUnderpass: true, depressionDepthM: 4.5, drainageDeficit: 80, historyScore: 60, criticalRainMmHr: 40 };
const live: LiveInputs = { rainNowMmHr: 30, rain24hMm: 20, reportTrusts: [0.9] };
const result = computeRisk(zone, live);
// result.risk, result.tier, result.factors, result.contributions, result.topReasons
```

## Critical rules
- ❌ **NEVER change weights or thresholds without a PR + announcement** — demo numbers depend on them
- ❌ **NEVER copy the formula elsewhere** — import from `@aquashield/risk-core`
- ✅ Always return the full `RiskBreakdown` (includes factor breakdown for the UI)
- ✅ The formula must be identical in Lambda and in the browser simulator

## Tests
```bash
npm test   # runs 9 tests — must always pass
```

## If you're editing this
1. Run `npm test` before and after
2. If you change weights/thresholds: update `WEIGHTS`, `TIER_THRESHOLDS`, `UNDERPASS_MULTIPLIER`
3. If you add a factor: update `FactorsSchema` in `packages/types/src/index.ts` via tiny PR
4. Announce any formula change in chat immediately after merging