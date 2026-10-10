/**
 * SEeded zone static attributes — CLIENT-SIDE SIMULATION INPUTS ONLY.
 *
 * The rainfall simulator runs `@aquashield/risk-core` in the browser so the demo can ask
 * "what if rain doubles?". The engine needs per-zone static attributes plus baseline live
 * inputs.
 *
 * The static attributes (isUnderpass, depressionDepthM, drainageDeficit, historyScore,
 * criticalRainMmHr) are REAL data for all 15 zones, copied from P4's verified dataset
 * `data/zones.geojson` (see data/SOURCES.md for citations). The table itself is
 * AUTO-GENERATED — regenerate with `npx tsx scripts/generate-mock-zones.ts` whenever the
 * geojson changes.
 *
 * The baseline live-weather values are a documented SIMULATION snapshot used only as the
 * simulator's starting point; anywhere the simulator is active the UI shows a
 * "SIMULATION" badge. They are also what `mocks/zones.json` was generated with, so the
 * simulator starts exactly at the mock API's risk index (no hidden drift).
 */
import { SEEDS, DEFAULT_SEED, type SeedEntry } from "./zoneStaticData";

export type { SeedEntry } from "./zoneStaticData";

export function getZoneSeed(zoneId: string): SeedEntry {
  return SEEDS[zoneId] ?? DEFAULT_SEED;
}

/** Baseline rainfall across all known zones — a sensible starting point for the slider. */
export function baselineRain(zoneIds: string[]): number {
  if (zoneIds.length === 0) return 20;
  const sum = zoneIds.reduce((s, id) => s + getZoneSeed(id).baselineRainMmHr, 0);
  return Math.round(sum / zoneIds.length);
}
