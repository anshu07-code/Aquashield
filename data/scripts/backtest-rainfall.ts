/**
 * data/scripts/backtest-rainfall.ts
 * ==================================
 * Real-rainfall backtest for Aquashield zones.
 *
 * Downloads REAL Delhi hourly precipitation from the Open-Meteo Historical
 * Weather API (archive-api.open-meteo.com — reanalysis, 0.25° grid cell
 * covering Delhi), caches it under data/cache/, then replays the risk engine
 * (packages/risk-core) hour-by-hour for every zone in data/zones.geojson on
 * the heaviest real rain day.
 *
 * The risk formula is NOT re-implemented here — it is imported from
 * @aquashield/risk-core so this backtest matches production numbers exactly.
 *
 * Usage:
 *   npx tsx data/scripts/backtest-rainfall.ts                    # fetch (cached) + full backtest
 *   npx tsx data/scripts/backtest-rainfall.ts --list-days        # only rank heavy-rain days
 *   npx tsx data/scripts/backtest-rainfall.ts --featured 2024-07-31  # force a demo day
 *
 * Outputs:
 *   data/cache/open-meteo-archive-delhi-<start>-<end>.json  (raw API response, ignored)
 *   data/backtest/delhi-heavy-rain.json                     (derived, committed)
 *
 * Sourcing / honesty:
 *   - Rainfall is REAL (archive), labelled in output as such. No invented numbers.
 *   - The chosen day is the heaviest real day OR a forced one — the script only
 *     reports what the data shows; the team picks the demo day.
 *   - Citizen-report evidence is intentionally absent in the backtest
 *     (reports are live-only), so hazard is from rainfall + zone geometry alone.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeRisk, type ZoneStatic } from "@aquashield/risk-core";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DATA = join(__dirname, "..");
const CACHE = join(DATA, "cache");
const OUT = join(DATA, "backtest");

const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
// One 0.25° grid cell at Delhi centre covers the whole metro area.
const LAT = 28.6122;
const LNG = 77.2287;
const START = "2023-01-01"; // 3 full monsoons + 2026
const END = "2026-09-30";
const TZ = "Asia%2FKolkata";
const CACHE_FILE = join(CACHE, `open-meteo-archive-delhi-${START}-${END}.json`);
const OUT_FILE = join(OUT, "delhi-heavy-rain.json");

/** Explicit dated waterlogging events cited in data/SOURCES.md (real news). */
const NEWS_EVENTS: { date: string; label: string }[] = [
  { date: "2024-07-31", label: "Old Rajinder Nagar flooded, multiple incidents (India Today)" },
  { date: "2025-09-05", label: "ISBT Kashmere Gate / Ring Road flooded (New Indian Express)" },
  { date: "2026-07-28", label: "July-2026 monsoon: ITO, Pitampura, Pandav Nagar, Mundka waterlogging (PWD)" },
];

interface ArchiveHourly {
  time: string[];
  precipitation: number[];
}

// ---------- Fetch (with cache + retry) ----------

async function fetchArchive(): Promise<ArchiveHourly> {
  if (existsSync(CACHE_FILE)) {
    console.log(`Using cached archive: ${CACHE_FILE}`);
    return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  }
  const url =
    `${ARCHIVE_URL}?latitude=${LAT}&longitude=${LNG}` +
    `&start_date=${START}&end_date=${END}&hourly=precipitation&timezone=${TZ}`;
  console.log(`Downloading real Delhi rainfall: ${START} → ${END}`);
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { hourly: ArchiveHourly };
      if (!data.hourly?.time || !data.hourly?.precipitation) {
        throw new Error("Unexpected payload: missing hourly precipitation");
      }
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(CACHE_FILE, JSON.stringify(data.hourly));
      console.log(`Cached raw archive to ${CACHE_FILE} (${data.hourly.time.length} hours)`);
      return data.hourly;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1_000 * attempt));
    }
  }
  throw new Error(`Open-Meteo archive fetch failed: ${String(lastErr)}`);
}

// ---------- Aggregations ----------

function dailyTotals(h: ArchiveHourly) {
  const map = new Map<string, number>();
  h.time.forEach((t, i) => {
    const day = t.slice(0, 10); // Asia/Kolkata local date (API honours TZ)
    map.set(day, (map.get(day) ?? 0) + (h.precipitation[i] ?? 0));
  });
  return [...map.entries()]
    .map(([date, mm]) => ({ date, mm: Math.round(mm * 10) / 10 }))
    .sort((a, b) => b.mm - a.mm);
}

function peakHour(h: ArchiveHourly, day: string): { hour: string; mm: number } {
  let best = { hour: "", mm: 0 };
  h.time.forEach((t, i) => {
    if (!t.startsWith(day)) return;
    const mm = h.precipitation[i] ?? 0;
    if (mm > best.mm) best = { hour: t, mm };
  });
  return best;
}

/** 24h rolling rainfall ending at index i (hours before i, inclusive). */
function rain24hAt(h: ArchiveHourly, i: number): number {
  let sum = 0;
  for (let k = Math.max(0, i - 23); k <= i; k++) sum += h.precipitation[k] ?? 0;
  return sum;
}

// ---------- Zone backtest ----------

interface RawZoneFeature {
  id: string;
  properties: {
    id: string;
    name: string;
    isUnderpass: boolean;
    depressionDepthM: number;
    drainageDeficit: number;
    historyScore: number;
    criticalRainMmHr: number;
  };
}

function loadZones(): { static: ZoneStatic & { name: string; id: string } }[] {
  const gj = JSON.parse(readFileSync(join(DATA, "zones.geojson"), "utf8")) as {
    features: RawZoneFeature[];
  };
  return gj.features.map((f) => ({
    static: {
      id: f.properties.id,
      name: f.properties.name,
      isUnderpass: f.properties.isUnderpass,
      depressionDepthM: f.properties.depressionDepthM,
      drainageDeficit: f.properties.drainageDeficit,
      historyScore: f.properties.historyScore,
      criticalRainMmHr: f.properties.criticalRainMmHr,
    },
  }));
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
  const listOnly = args.includes("--list-days");
  const featuredArg = args.indexOf("--featured");
  const forcedDay = featuredArg !== -1 ? args[featuredArg + 1] : undefined;

  const h = await fetchArchive();

  const days = dailyTotals(h);
  const top15 = days.slice(0, 15);

  console.log("\n=== Real heaviest Delhi rain days (archive, mm/day) ===");
  for (const d of top15) {
    const peak = peakHour(h, d.date);
    const news = NEWS_EVENTS.find((n) => n.date === d.date);
    console.log(
      `  ${d.date}  ${String(d.mm).padStart(5)} mm  peak ${peak.mm} mm/h at ${peak.hour.slice(11, 16)}` +
        (news ? `  ← ${news.label}` : ""),
    );
  }

  if (listOnly) {
    console.log("\n--list-days: stopped before zone backtest.");
    process.exit(0);
  }

  // Choose the featured day: forced option wins; else the heaviest day that
  // has a cited news event; else simply the heaviest day.
  let featured: string;
  if (forcedDay) {
    const hit = days.find((d) => d.date === forcedDay);
    if (!hit) {
      console.error(`ERROR: --featured ${forcedDay} has no data in the archive window.`);
      process.exit(1);
    }
    featured = forcedDay;
    console.log(`\nForced featured day: ${featured} (${hit.mm} mm) — you take responsibility for it.`);
  } else {
    const newsDay = top15.find((d) => NEWS_EVENTS.some((n) => n.date === d.date));
    featured = (newsDay ?? top15[0]).date;
    const info = top15.find((d) => d.date === featured);
    console.log(`\nAuto-selected featured day: ${featured} (${info?.mm} mm)`);
  }

  // Small honest note: no reports in backtest, and archive rain reflects the
  // grid cell (not per-underpass telemetry) — stated in output.
  const zones: {
    id: string;
    name: string;
    isUnderpass: boolean;
    criticalRainMmHr: number;
    maxRisk: number;
    maxTier: string;
    peakHourMmHr: number;
    rain24hMm: number;
    firstCriticalHour: string | null;
    timeline: { hour: string; mmHr: number; risk: number; tier: string }[];
  }[] = [];

  const dayStartIdx = h.time.findIndex((t) => t.startsWith(featured));
  if (dayStartIdx === -1) throw new Error(`Featured day ${featured} not in archive`);
  const dayEndIdx = dayStartIdx + 23; // 24 points 00:00..23:00

  for (const z of loadZones()) {
    const timeline: { hour: string; mmHr: number; risk: number; tier: string }[] = [];
    let maxRisk = 0;
    let maxTier = "SAFE";
    let firstCriticalHour: string | null = null;
    for (let i = dayStartIdx; i <= dayEndIdx; i++) {
      const mmHr = h.precipitation[i] ?? 0;
      const rain24 = rain24hAt(h, i);
      // Backtest: no live citizen reports (live-only evidence) → reportTrusts []
      const br = computeRisk(z.static, { rainNowMmHr: mmHr, rain24hMm: rain24, reportTrusts: [] });
      timeline.push({ hour: h.time[i], mmHr: Math.round(mmHr * 10) / 10, risk: br.risk, tier: br.tier });
      if (br.risk > maxRisk) {
        maxRisk = br.risk;
        maxTier = br.tier;
      }
      if (br.tier === "CRITICAL" && !firstCriticalHour) firstCriticalHour = h.time[i];
    }
    const peak = peakHour(h, featured);
    zones.push({
      id: z.static.id,
      name: z.static.name,
      isUnderpass: z.static.isUnderpass,
      criticalRainMmHr: z.static.criticalRainMmHr,
      maxRisk,
      maxTier,
      peakHourMmHr: Math.round(h.precipitation[dayStartIdx + h.time.slice(dayStartIdx, dayEndIdx + 1).indexOf(peak.hour)] * 10) / 10,
      rain24hMm: Math.round(rain24hAt(h, dayEndIdx) * 10) / 10,
      firstCriticalHour,
      timeline,
    });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: "Open-Meteo Historical Weather API (archive-api.open-meteo.com) — reanalysis over a 0.25° grid cell centred on Delhi",
    sourceUrl: `${ARCHIVE_URL}?latitude=${LAT}&longitude=${LNG}&start_date=${START}&end_date=${END}&hourly=precipitation&timezone=Asia/Kolkata`,
    location: { name: "Delhi (single 0.25° grid cell)", lat: LAT, lng: LNG },
    window: { start: START, end: END },
    heaviestDays: top15,
    featuredDay: {
      date: featured,
      mm: days.find((d) => d.date === featured)?.mm ?? 0,
      peak: peakHour(h, featured),
    },
    notes:
      "Rainfall is REAL (archive). Zone hazard excludes live citizen reports " +
      "(reports are live-only) so it reflects rainfall + zone geometry alone. " +
      "One grid cell covers all Delhi zones; underpass coordinates are ground truth, rainfall is city-wide.",
    zones,
  };

  mkdirSync(OUT, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
  console.log(`\nWrote ${OUT_FILE}`);
}

main().catch((err: unknown) => {
  console.error("Backtest failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
