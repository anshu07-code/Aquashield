# P4 — DATA, RISK & ROUTING LEAD (owns credibility, demo story)
Folders: `packages/risk-core/` (done + tested; you own it), `data/`, route module in `services/api/src/route/`, `docs/DEMO.md`.

## Start every AI session with
> Read AGENTS.md, docs/CONTRACT.md, docs/RISK_ENGINE.md and docs/roles/P4_DATA_RISK.md. I am P4. packages/risk-core already exists and is tested; extend, don't rewrite. Cache all external API responses to disk so the data pipeline is reproducible offline. Every claim needs a source in data/SOURCES.md.

## Build order
1. **Review risk-core today:** run `npm test`; sanity-check numbers with real zones; tune only via PR + announcement.
2. **Zones pipeline (`data/scripts`, Node or Python), output `data/zones.geojson` (~30-40 zones across Delhi):**
   - OSM Overpass: road underpasses (`tunnel=yes` or `layer=-1` on highways), nearby waterways/drains, built-up land use share.
   - Open-Meteo Elevation API -> `depressionDepthM` = zone elevation minus mean of a ~500 m ring.
   - `drainageDeficit` 0-100 from drain distance + built-up share (document the formula).
   - `historyScore` 0-100 seeded from publicly reported waterlogging points (news/government). Store every source URL in `data/SOURCES.md`. Verify any named location yourself.
   - `criticalRainMmHr` per zone (lower for underpasses).
   - Cache raw API responses under `data/cache/` (gitignored if large).
   - Start with 10-15 zones TODAY so P2/P1 aren't blocked, expand tomorrow.
3. **Expose static attrs** to the frontend simulator (agree with P1/P2: either in `/zones` or shipped as a static JSON). Update contract by PR if needed.
4. **Route module:** get 2-3 alternatives from Amazon Location Service CalculateRoutes (timebox 90 min) or OSRM `alternatives=true` fallback. For each polyline find zones within ~40 m. `score = durationMin + lambda * sum(hazardWeight(tier))` (SAFE 0, WATCH 2, HIGH 6, CRITICAL 20). Routes crossing a CRITICAL zone are `unsafe` and never recommended if an alternative exists. `summary` e.g. "Avoids 1 flooded underpass - +6 min". Output must match `RouteResponseSchema`.
5. **Demo scenario (`docs/DEMO.md`):** choose an origin/destination pair whose default fastest route crosses a CRITICAL underpass under the simulated rain. Record exact coordinates and slider values. If you must precompute a fallback polyline, disclose it in the README.
6. **Stretch:** historical backtest with Open-Meteo archive for a documented heavy-rain day (verify the date and rainfall yourselves before claiming anything).

## Done when
Every zone shows a defensible score with a visible breakdown; simulator and backend give identical numbers; if a judge asks "why is this zone 82?" the UI answers.

## Also owns
Demo script and all impact claims (sourced or removed). Team rehearsal lead.
