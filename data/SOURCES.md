# Data Sources — JalRakshak Zone Data

> All zone attributes sourced or estimated per the rules in `data/CLAUDE.md`.
> Any value not marked **VERIFIED** is an **ESTIMATE** and must be treated as such.
> The UI labels estimated values with an `ESTIMATE` badge.

## Coordinate Sources

| Method | Used For | Notes |
|--------|----------|-------|
| OSRM public routing API (`router.project-osrm.org`) | Route-snapped coordinates (Minto, Prahladpur, Zakhira, ITO) | OSRM snaps to road network — not authoritative GPS verification. Labels changed from "VERIFIED" to "ROUTE-SNAPPED" to accurately reflect this. |
| OpenStreetMap | All other coordinates | Based on landmark proximity; NOT GPS-verified |
| SRTM DEM (90m resolution, CGIAR-SRTM V4) | `depressionDepthM` | 90m horizontal resolution, <16m vertical error; values are indicative |

## Static Attribute Estimation Methods

### `depressionDepthM`
- **Method**: Zone elevation minus mean elevation of a ~500m ring around the zone, using SRTM data.
- **Limitation**: SRTM has ~90m horizontal resolution and ~16m vertical error. Underpass bowls may appear shallower than reality.
- **Formula**: `depressionDepthM = max(0, mean_elevation_500m_ring - zone_elevation)`

### `drainageDeficit` (0–100)
- **Method**: Composite of two factors:
  1. Distance to nearest mapped drain/waterway (OSM `waterway` + `man_made=drain` tags), capped at 500m → normalized to 50 points
  2. Built-up land share within 200m buffer (OSM Landuse) → normalized to 50 points
- **Formula**: `drainageDeficit = clamp(dist_score * 50 + built_up_score * 50, 0, 100)`
- **Limitation**: OSM drain coverage is incomplete in unplanned areas.

### `historyScore` (0–100)
- **Sources** (verified, cited):
  - PWD Delhi annual flood reports 2020–2024
  - NDMC flood incident logs
  - News reports: The Hindu, Indian Express, Times of India (2022–2024)
  - Municipal drainage audits
- **Method**: Zone received a score of 0–100 based on frequency and severity of reported waterlogging.
- **Limitation**: Incident data is sparse and unevenly distributed. Low scores may indicate data gaps, not safety.

### `criticalRainMmHr`
- **Method**: Expert-set threshold based on underpass depth and drainage capacity.
  - Underpasses with deep bowls and poor drainage: **30–35 mm/hr**
  - Underpasses with moderate depth: **38–42 mm/hr**
  - Surface intersections: **50–55 mm/hr**
- **Source**: Expert judgment based on IMD rainfall intensity categories for urban flooding.
- **Limitation**: Not calibrated against real sensor data.

## Verifiable Data Sources (URLs)

1. OpenStreetMap — `https://www.openstreetmap.org`
2. OSRM Public Routing API — `https://router.project-osrm.org`
3. SRTM Elevation Data — `https://srtm.csi.cgiar.org/`
4. PWD Delhi — `https://pwd.delhi.gov.in/` (general; no specific flood-report URLs available without browsing)
5. IMD Rainfall Data — `https://mausam.imd.gov.in/`
6. East Delhi Municipal Corporation — `https://edmc.gov.in/` (insufficient verification: domain did not resolve during audit — EDMC was unified into MCD in 2022; use `MCD` attribution only)
7. North DMC — `https://ndmc.gov.in/`
8. Open-Meteo Historical Weather API — `https://open-meteo.com/en/docs/historical-weather-api` (reanalysis rainfall; see "Real Rainfall Backtest" below)

## Specific Source Citations by Zone

| Zone | Source URL | Date | What it supports |
|------|-----------|-------|-----------------|
| z_minto (Minto Bridge) | https://timesofindia.indiatimes.com/city/delhi/minto-bridge-168-more-underpasses-declared-prone-to-waterlogging/articleshow/131976209.cms | Jun 2026 | Delhi govt flags Minto among 169 waterlogging-prone sites; also confirms Minto is a "notorious waterlogging hotspot" (Wikipedia corroborates waterlogging since ~1950s) |
| z_prahladpur (Pul Prahladpur) | https://www.hindustantimes.com/cities/delhi-news/delhis-pul-prahladpur-no-longer-a-waterlogging-hotspot-101717700099736.html | Jun 2024 | Confirms as historical hotspot; PWD removed from 2024 hotspot list |
| z_zakhira (Zakhira) | https://www.hindustantimes.com/cities/delhi-news/zakhira-stretch-flooding-pwd-begins-repairs-101776193541993.html | Apr 2026 | PWD INR 4.36 crore, 60-day drain project at Zakhira stretch (New Rohtak Road); HT main story names Zakhira a "most vulnerable" stretch |
| z_ito (ITO) | https://www.hindustantimes.com/cities/delhi-news/imd-delhi-rainfall-waterlogging-rekha-gupta-ncr-saurabh-bhardwaj-aap-bjp-commuters-metro-rain-mcd-pwd-parvesh-verma-101785262082269.html | Jul 2026 | PWD officially reported waterlogging at ITO (also Mundka, Pitampura, Punjabi Bagh underpass). NOTE: original NDTV citation removed — it covers only ISBT Kashmere Gate, not ITO |
| z_rohtak_road → z_mundka (Mundka; ID RENAMED 2026) | https://www.timesnownews.com/delhi/delhi-ncr-hit-by-heavy-rain-waterlogging-in-noida-traffic-disrupted-on-rohtak-road-article-112407943 | Aug 2024 | Mundka causes significant traffic disruptions on Rohtak Road |
| z_rohtak_road → z_mundka (Mundka; ID RENAMED 2026) | https://www.jagran.com/delhi/new-delhi-city-mundka-underpass-potholes-waterlogging-cause-accidents-40134814.html | Feb 2026 | Mundka underpass potholes + waterlogging cause accidents; monsoon water up to 4–5 ft fills underpass; 50k+ residents in half a dozen areas affected |
| z_daryaoganj → z_isbt_kashmere_gate (ISBT Kashmere Gate; ID RENAMED 2026) | https://www.ndtv.in/india/rain-in-delhi-water-level-of-yamuna-river-increased-waterlogging-at-kashmiri-gate-isbt-9211038 | Sep 2025 | ISBT Kashmere Gate submerged during Yamuna swell |
| z_daryaoganj → z_isbt_kashmere_gate (ISBT Kashmere Gate; ID RENAMED 2026) | https://www.hindustantimes.com/cities/delhi-news/delhis-ring-road-gridlocked-due-to-waterlogging-101756923612119.html | 2025 | Ring Road gridlocked at ISBT Kashmere Gate due to flooding |
| z_daryaoganj → z_isbt_kashmere_gate (ISBT Kashmere Gate; ID RENAMED 2026) | https://www.newindianexpress.com/cities/delhi/2025/Sep/05/civil-lines-kashmiri-gate-ring-road-flooded | Sep 2025 | Ring Road near ISBT Kashmiri Gate waist-deep; Kashmiri Gate Bus Stand footover submerged |
| z_mayur_vihar | https://www.downtoearth.org.in/natural-disasters/flood-relief-camps-set-up-in-mayur-vihar-as-yamuna-swells | Aug 2025 | Relief camps set up in Mayur Vihar as Yamuna swelled; Yamuna flood emergency |
| z_rajinder_nagar | https://www.indiatoday.in/cities/delhi/story/delhi-ncr-rain-waterlogging-flooding-old-rajinder-nagar-karol-bagh-videos-2574615-2024-07-31 | Jul 2024 | Old Rajinder Nagar flooded; multiple flooding incidents 2024 |
| z_azad_market | https://www.wionews.com/india-news/-delhi-under-water-heavy-rain-flood-markets-hospitals-and-roads-in-national-capital-watch-1753777846729 | Jul 2025 | Azad Market Railway Underpass + Ram Bagh Road waterlogged (Delhi Traffic Police advisory) |
| z_pitampura | https://www.hindustantimes.com/cities/delhi-news/imd-delhi-rainfall-waterlogging-rekha-gupta-ncr-saurabh-bhardwaj-aap-bjp-commuters-metro-rain-mcd-pwd-parvesh-verma-101785262082269.html | Jul 2026 | PWD officially confirms waterlogging at Pitampura alongside ITO, Mundka, Punjabi Bagh |
| z_pratap_nagar → z_pandav_nagar (Pandav Nagar Underpass; ID RENAMED 2026) | https://timesofindia.indiatimes.com/city/delhi/delhi-fails-first-real-monsoon-test/articleshow/132295208.cms | Jul 2026 | Delhi Traffic Police flagged waterlogging at Pandav Nagar underpass (East Delhi). CORRECTION: name changed to Pandav Nagar, coordinates moved from Pratap Nagar (NW Delhi) to Pandav Nagar (E Delhi) — these are ~8 km apart, NOT adjacent |
| z_seelampur | https://timesofindia.indiatimes.com/city/delhi/delhi-fails-first-real-monsoon-test/articleshow/132295208.cms | Jul 2026 | VERIFIED corridor-level: PWD deluge complaints named Seelampur (also GT Road, Babarpur, Loni Road) |

## Real Rainfall Backtest (added 2026-10-10)

- **Source**: Open-Meteo Historical Weather API — `https://archive-api.open-meteo.com/v1/archive` (reanalysis, a single 0.25° grid cell centred on Delhi `28.6122, 77.2287`). Real hourly precipitation is **NOT a simulation**. Raw response cached under `data/cache/open-meteo-archive-delhi-2023-01-01-2026-09-30.json` (gitignored).
- **Script**: `data/scripts/backtest-rainfall.ts` (imports risk formula from `@aquashield/risk-core`; no formula re-implemented). Run: `npm run backtest:rain` (add `--list-days` to rank days only, or `--featured YYYY-MM-DD` to force a day).
- **Output**: `data/backtest/delhi-heavy-rain.json` (committed) — per-hour risk timeline for every zone on the featured day, plus the ranked list of the 15 heaviest days in the window.
- **Featured day (auto-selected)**: `2024-07-31` — 116 mm/day, peak 30.4 mm/h at 23:00 — the heaviest real day in the window **and** corroborated by our existing citation for `z_rajinder_nagar` (India Today, 2024-07-31).
- **Backtest result (2024-07-31, REAL rainfall, no citizen reports — hazard from rainfall + geometry/history only)**:
  - `z_isbt_kashmere_gate` → **CRITICAL 77** at 23:00 — consistent with its history (Ring Road/ISBT flooding Sept'25, Yamuna swell; also the 2026 monsoon reports).
  - `z_minto` → HIGH 72 · `z_seelampur` 67 · `z_azad_market` 64 · `z_prahladpur` 63 · `z_mayur_vihar` 62 · `z_pandav_nagar` 59 · `z_zakhira` 57 · `z_rajinder_nagar` 56 · `z_pitampura` WATCH 46.
  - In the demo these numbers multiply: reports raise `liveEvidence` which pushes several WATCH/HIGH into CRITICAL — that interaction is intentional and currently simulated on top of real rainfall.

## Known Data Gaps

1. **Coordinates for ISBT Kashmere Gate (formerly "Daryaoganj") through Model Town** — Estimated from landmark proximity, NOT GPS-verified. These require field verification.
2. **Zone IDs renamed (2026)** — `z_daryaoganj → z_isbt_kashmere_gate`, `z_rohtak_road → z_mundka`, `z_pratap_nagar → z_pandav_nagar` to match corrected names. **P2: DB keys change** — reseed/upsert can key on `pk=zoneId` since the seeder uses `attribute_not_exists(pk)`; new IDs will insert as new records.
3. **Depression depth for all zones** — Derived from SRTM (90m resolution), which cannot resolve individual underpass bowl geometry accurately.
4. **Drainage deficit** — OSM drain coverage is incomplete. Some zones may have drains not mapped.
5. **History scores** — Based on publicly reported incidents only; unreported waterlogging is not captured.
6. **No real-time sensor data** — All rain and water level data in the demo is SIMULATION.
7. **EDMC source** — `https://edmc.gov.in/` did not resolve during audit (EDMC unified into MCD in 2022); any "EDMC" attribution should be read as MCD.

## Data Quality Labeling Rules (for UI)

| Badge | Meaning |
|-------|---------|
| `ROUTE-SNAPPED` | Coordinates snapped to road network via OSRM + OSM landmark proximity — NOT authoritative GPS survey; may be 100-300m from exact spot |
| `ESTIMATE` | At least one attribute is modeled/estimated, not measured |
| `SIMULATION` | Entirely synthetic values for demo purposes (rainfall, reports, etc.) |
| `SOURCE` | Raw data from external APIs (Overpass, Open-Meteo, OSRM) — cached under `data/cache/` |