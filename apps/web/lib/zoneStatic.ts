/**
 * SEeded zone static attributes — CLIENT-SIDE SIMULATION INPUTS ONLY.
 *
 * The rainfall simulator runs `@aquashield/risk-core` in the browser so the demo can ask
 * "what if rain doubles?". The engine needs per-zone static attributes
 * (isUnderpass, depressionDepthM, drainageDeficit, historyScore, criticalRainMmHr) plus
 * baseline live inputs. The real values live in `data/zones.geojson` (P4) and will be
 * exposed by the backend; until then these seeds let the simulator run.
 *
 * THESE ARE SEEDS, NOT MEASUREMENTS. Anywhere the simulator is active the UI shows a
 * "SIMULATION" badge. Values were calibrated so that at each zone's baseline rainfall the
 * engine reproduces the live risk index returned by the API (small drift is expected and
 * disclosed on screen).
 */
import type { ZoneStatic, LiveInputs } from "@aquashield/risk-core";

type SeedEntry = {
  statics: ZoneStatic;
  /** baseline live weather + trusted reports at the moment the mock snapshot was taken */
  baseline: Omit<LiveInputs, "rainNowMmHr">;
  /** baseline rainfall in mm/hr (so the slider starts near reality) */
  baselineRainMmHr: number;
};

const SEEDS: Record<string, SeedEntry> = {
  z_minto: {
    statics: {
      isUnderpass: true,
      depressionDepthM: 5.0,
      drainageDeficit: 82,
      historyScore: 62,
      criticalRainMmHr: 40,
    },
    baseline: { rain24hMm: 70, reportTrusts: [0.86, 0.8] },
    baselineRainMmHr: 55,
  },
  z_prahladpur: {
    statics: {
      isUnderpass: true,
      depressionDepthM: 4.2,
      drainageDeficit: 74,
      historyScore: 55,
      criticalRainMmHr: 48,
    },
    baseline: { rain24hMm: 45, reportTrusts: [0.75, 0.6] },
    baselineRainMmHr: 44,
  },
  z_ito: {
    statics: {
      isUnderpass: false,
      depressionDepthM: 2.4,
      drainageDeficit: 60,
      historyScore: 70,
      criticalRainMmHr: 55,
    },
    baseline: { rain24hMm: 45, reportTrusts: [] },
    baselineRainMmHr: 31,
  },
  z_zakhira: {
    statics: {
      isUnderpass: true,
      depressionDepthM: 2.0,
      drainageDeficit: 30,
      historyScore: 25,
      criticalRainMmHr: 52,
    },
    baseline: { rain24hMm: 8, reportTrusts: [] },
    baselineRainMmHr: 5,
  },
};

/** Reasonable defaults for zones that don't have a seed entry yet. */
const DEFAULT_SEED: SeedEntry = {
  statics: {
    isUnderpass: false,
    depressionDepthM: 1.5,
    drainageDeficit: 50,
    historyScore: 40,
    criticalRainMmHr: 50,
  },
  baseline: { rain24hMm: 20, reportTrusts: [] },
  baselineRainMmHr: 10,
};

export function getZoneSeed(zoneId: string): SeedEntry {
  return SEEDS[zoneId] ?? DEFAULT_SEED;
}

/** Baseline rainfall across all known zones — a sensible starting point for the slider. */
export function baselineRain(zoneIds: string[]): number {
  if (zoneIds.length === 0) return 20;
  const sum = zoneIds.reduce((s, id) => s + getZoneSeed(id).baselineRainMmHr, 0);
  return Math.round(sum / zoneIds.length);
}
