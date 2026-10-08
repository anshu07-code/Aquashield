# P2 — INGEST LAMBDA (part of Cloud & Backend Lead)

**Owner:** P2  
**Path:** `services/ingest/`

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md, docs/SYNCHRONIZATION.md, and this file first.
You are P2. The ingest Lambda is part of your scope.
```

## What you're building
EventBridge Scheduler (every 15 min) → Lambda → Open-Meteo → risk-core → DynamoDB RiskSnapshots

## Critical rules
- ✅ Import risk logic from `@jalrakshak/risk-core` (never re-implement)
- ✅ Cache last good forecast — if Open-Meteo fails, reuse cache and set `stale=true`
- ✅ Write structured JSON logs for CloudWatch
- ✅ TTL on RiskSnapshots = 48h
- ❌ Don't call Open-Meteo from the browser (P1 can't call it directly)
- ❌ Don't change risk-core weights (P4 owns those)

## Build order
1. Lambda that loops over all zones from DynamoDB
2. For each zone: fetch Open-Meteo (minutely_15 precipitation + past 24h sum)
3. Compute risk with `risk-core` (using active reports from DynamoDB)
4. Write `RiskSnapshot` (pk=zoneId, sk=timestamp, TTL 48h)
5. On Open-Meteo failure: read last snapshot, set stale=true, log warning
6. EventBridge Scheduler: rate 15 minutes, target = this Lambda

## Verify
```bash
npm run verify:p2
```