/**
 * Aquashield Flood Risk Index (0-100). Pure functions, no I/O.
 * Used by BOTH the backend (ingest/zone Lambdas) and the browser (rainfall simulator),
 * so the simulator always matches the backend. It is an explainable index, NOT a probability.
 */
import type { Contributions, Factors, ForecastPoint, RiskBreakdown, Tier } from "@aquashield/types";

export interface ZoneStatic {
  isUnderpass: boolean;
  depressionDepthM: number; // zone elevation minus mean elevation of ~500 m ring (>= 0 means a bowl)
  drainageDeficit: number; // 0-100, higher = worse drainage
  historyScore: number; // 0-100, seeded from cited public sources
  criticalRainMmHr: number; // zone tolerance; lower for underpasses
}

export interface LiveInputs {
  rainNowMmHr: number;
  rain24hMm: number;
  /** trust values (0-1) of ACTIVE, non-rejected reports near the zone */
  reportTrusts: number[];
}

export const WEIGHTS = {
  rainNow: 0.3,
  antecedent24h: 0.15,
  depression: 0.15,
  drainageDeficit: 0.15,
  history: 0.1,
  liveEvidence: 0.15,
} as const;

export const UNDERPASS_MULTIPLIER = 1.1;
export const TIER_THRESHOLDS = { WATCH: 30, HIGH: 55, CRITICAL: 75 } as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function tierFor(risk: number): Tier {
  if (risk >= TIER_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (risk >= TIER_THRESHOLDS.HIGH) return "HIGH";
  if (risk >= TIER_THRESHOLDS.WATCH) return "WATCH";
  return "SAFE";
}

export function computeFactors(z: ZoneStatic, live: LiveInputs): Factors {
  const rainNow = (clamp(live.rainNowMmHr / z.criticalRainMmHr, 0, 1.5) / 1.5) * 100;
  const antecedent24h = clamp(live.rain24hMm / 100, 0, 1) * 100; // 100 mm/24h = max
  const depression = clamp(z.depressionDepthM / 6, 0, 1) * 100; // 6 m bowl = max
  const noEvidence = live.reportTrusts.reduce((p, t) => p * (1 - 0.6 * clamp(t, 0, 1)), 1);
  const liveEvidence = (1 - noEvidence) * 100;
  return {
    rainNow: round1(rainNow),
    antecedent24h: round1(antecedent24h),
    depression: round1(depression),
    drainageDeficit: round1(clamp(z.drainageDeficit, 0, 100)),
    history: round1(clamp(z.historyScore, 0, 100)),
    liveEvidence: round1(liveEvidence),
  };
}

const REASON_LABELS: Record<keyof Factors, string> = {
  rainNow: "Heavy rainfall now",
  antecedent24h: "Ground already saturated (24h rain)",
  depression: "Low-lying / bowl-shaped location",
  drainageDeficit: "Poor drainage nearby",
  history: "Known waterlogging history",
  liveEvidence: "Verified citizen reports nearby",
};

export function computeRisk(z: ZoneStatic, live: LiveInputs, etaMin: number | null = null): RiskBreakdown {
  const factors = computeFactors(z, live);
  const keys = Object.keys(WEIGHTS) as (keyof Factors)[];
  const contributions = {} as Contributions;
  let sum = 0;
  for (const k of keys) {
    contributions[k] = round1(factors[k] * WEIGHTS[k]);
    sum += factors[k] * WEIGHTS[k];
  }
  const underpassMultiplier = z.isUnderpass ? UNDERPASS_MULTIPLIER : 1;
  const risk = Math.round(clamp(sum * underpassMultiplier, 0, 100));
  const topReasons = [...keys]
    .sort((a, b) => contributions[b] - contributions[a])
    .filter((k) => factors[k] >= 40)
    .slice(0, 3)
    .map((k) => REASON_LABELS[k]);
  return { risk, tier: tierFor(risk), etaMin, factors, contributions, underpassMultiplier, topReasons };
}

/**
 * Minutes until risk >= CRITICAL using the 15-min forecast. 0 = already critical, null = not within 3h.
 * `nowMs` is injectable for tests.
 */
export function computeEta(
  z: ZoneStatic,
  live: LiveInputs,
  forecast: ForecastPoint[],
  nowMs: number = Date.now(),
): number | null {
  if (computeRisk(z, live).risk >= TIER_THRESHOLDS.CRITICAL) return 0;
  const horizonMs = 180 * 60_000;
  const sorted = [...forecast].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  for (const p of sorted) {
    const dt = Date.parse(p.ts) - nowMs;
    if (dt < 0 || dt > horizonMs) continue;
    const r = computeRisk(z, { ...live, rainNowMmHr: p.mmHr }).risk;
    if (r >= TIER_THRESHOLDS.CRITICAL) return Math.round(dt / 60_000);
  }
  return null;
}
