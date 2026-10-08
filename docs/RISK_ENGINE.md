# RISK ENGINE (implemented in `packages/risk-core`, tested)

Flood Risk Index 0-100. **An explainable index, NOT a probability.** Say so when asked.

```
risk = 0.30*rainNow + 0.15*antecedent24h + 0.15*depression
     + 0.15*drainageDeficit + 0.10*history + 0.15*liveEvidence
if isUnderpass: risk = min(100, risk * 1.10)
```

| Factor | How it's computed (0-100) |
|---|---|
| rainNow | `clamp(rainNowMmHr / zone.criticalRainMmHr, 0, 1.5) / 1.5 * 100` |
| antecedent24h | `clamp(rain24hMm / 100, 0, 1) * 100` |
| depression | `clamp(depressionDepthM / 6, 0, 1) * 100` (zone elevation minus mean elevation of ~500 m ring) |
| drainageDeficit | 0-100 from data pipeline: distance to mapped drains/waterways, built-up share |
| history | 0-100 seeded from cited public waterlogging reports (`data/SOURCES.md`) |
| liveEvidence | `(1 - prod(1 - 0.6*trust_i)) * 100` over active reports near the zone |

Tiers: SAFE <30 · WATCH 30-54 · HIGH 55-74 · CRITICAL >=75.
ETA-to-critical: walk the 15-min forecast (next 3h), first step with risk >= 75; `0` if already; `null` if none.

## Rules
- The formula lives ONLY in `packages/risk-core`. Backend Lambdas and the browser simulator import it. Don't copy it.
- Changing weights/thresholds = PR by P4 + announcement + test update, because the demo numbers depend on it.
- Static zone attributes come from `data/zones.geojson` (P4). Be ready to explain each attribute to a judge.

## Trust score (P3, in vision module)
`trust = visionConfidence x corroboration x rainConsistency x ageDecay`
- corroboration: more independent reports within 150 m / 30 min -> higher (cap 1)
- rainConsistency: flood report while forecast is dry -> down-weighted
- ageDecay: linear decay to 0 over the 6 h TTL

## Honest limitations (put in README)
Coarse elevation data (~90 m), history seeded from public reports, weights are expert-set not learned,
small image evaluation set. Next step would be calibrating against real incident logs.
