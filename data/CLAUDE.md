# P4 — DATA, RISK & ROUTING LEAD

**Owner:** P4  
**Paths:** `packages/risk-core/`, `data/`, `services/api/src/route/`, `docs/DEMO.md`

## Session start
```
Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md, docs/SYNCHRONIZATION.md, and this file first.
You are P4. packages/risk-core already exists and is tested. Extend it, don't rewrite.
Every zone attribute needs a source in data/SOURCES.md.
```

## What you're building
- Zone data pipeline (OSM Overpass → zones.geojson)
- Routing module with Amazon Location Service or OSRM fallback
- Demo scenario documentation
- All impact claims for the video/writeup

## Critical rules

### NEVER do these
- ❌ Don't change risk-core weights without PR + announcement (demo numbers depend on them)
- ❌ Don't claim a named location without verifying it yourself
- ❌ Don't ship zone data without sources in data/SOURCES.md
- ❌ Don't change `packages/types/src/index.ts` without announcing in chat
- ❌ Don't call Overpass from the browser or from a Lambda that runs frequently

### ALWAYS do these
- ✅ Cache all external API responses under `data/cache/` (gitignored)
- ✅ Every number in the UI or video must be explainable from the data
- ✅ Risk engine formula lives ONLY in `packages/risk-core` — never re-implement
- ✅ All zone attributes documented in `data/SOURCES.md` with URLs
- ✅ Demo coordinates and slider values documented in `docs/DEMO.md`

## Build order
1. **Verify risk-core is solid** (today):
   - Run `npm test` — must pass
   - Check: tier boundaries, monotonicity, ETA edge cases
   - If you find a bug: fix by PR, announce, update tests

2. **Zones pipeline** (data/scripts):
   - Output: `data/zones.geojson` (~30-40 Delhi zones, at minimum 10-15 today)
   - OSM Overpass: underpasses (`tunnel=yes` or `layer=-1`), waterways/drains, built-up land use
   - Open-Meteo Elevation API → `depressionDepthM` (zone elev - mean of ~500m ring)
   - `drainageDeficit` 0-100 from drain distance + built-up share (document formula)
   - `historyScore` 0-100 from cited public waterlogging reports
   - `criticalRainMmHr` (lower for underpasses)
   - Cache raw API responses in `data/cache/`

3. **Expose static zone attrs** to frontend:
   - Coordinate with P1/P2: either add to `/zones` response or ship as `data/zones.json`
   - If adding to contract: tiny PR to `packages/types`, announce in chat

4. **Route module** (services/api/src/route/):
   - Get 2-3 alternatives from Amazon Location Service CalculateRoutes (timebox 90min) or OSRM fallback
   - For each polyline: find zones within ~40m
   - Score = durationMin + λ × Σ(hazardWeight(tier)) where SAFE=0, WATCH=2, HIGH=6, CRITICAL=20
   - Routes crossing CRITICAL zone are `unsafe`, never recommended if alternative exists
   - Output must match `RouteResponseSchema`

5. **Demo scenario** (docs/DEMO.md):
   - Origin/destination pair where default fastest route crosses a CRITICAL underpass
   - Exact coordinates + slider values for the rainfall simulator
   - If precomputing fallback polyline: disclose in README

6. **Demo script** (docs/DEMO.md):
   - 3-minute timing table per PLAYBOOK.md section 12
   - Sourced claims only — if you can't verify it, remove it

7. **Stretch**: historical backtest with Open-Meteo archive for a real heavy-rain day

## Verify before push
```bash
npm run verify:p4   # runs npm test (risk-core tests)
# Also: validate data/zones.geojson against schema
```

## Dependencies on others
- P1: needs zone static attrs for simulator — provide `data/zones.json` or ask P2 to add to `/zones`
- P2: needs `data/zones.geojson` to seed DynamoDB — deliver ASAP (even a stub with 4 zones)
- P3: needs corroboration data (reports near zone) — ensure `/zones/{id}` includes report counts

## If you're blocked
- Overpass API slow? Use cached data from a previous run
- No zone geojson yet? Create a simple JSON file with 4 mock zones for P1/P2 to start
- OSM rate-limiting? Queue requests, cache everything to disk