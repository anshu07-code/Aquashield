/**
 * Report trust score — OWNED BY P3 (AI lead). Unit tests welcome in data/eval/ or here.
 *
 *   trust = visionConfidence × corroboration × rainConsistency × ageDecay    (docs/RISK_ENGINE.md)
 *
 * - corroboration: other active reports within 150 m / 30 min raise trust (capped at 1)
 * - rainConsistency: a flood report while it is dry outside is down-weighted
 * - ageDecay: linear decay to 0 over the 6 h TTL
 */
import type { VisionAnalysis } from "@aquashield/types";

const REPORT_TTL_MS = 6 * 60 * 60 * 1000; // 6 h

export interface TrustInputs {
  vision: VisionAnalysis;
  /** trust-free: how many OTHER active reports of flooding within 150 m / 30 min */
  nearbyCount: number;
  /** current zone rainfall, mm/hr */
  rainNowMmHr: number;
  /** ms since submission (0 at submission time) */
  ageMs: number;
}

export function computeTrust(i: TrustInputs): number {
  const confidence = Math.max(0, Math.min(1, i.vision.confidence));

  // corroboration: baseline 0.7 when the model is confident alone, +0.1 per neighbour, cap 1
  const corroboration = Math.min(1, 0.7 + 0.1 * Math.max(0, i.nearbyCount));

  // rain consistency: flood claims during dry weather are down-weighted; blocked drains don't need rain
  const claimsFlooding = i.vision.floodedRoad || i.vision.waterDepthTier !== "none";
  const rainConsistency = claimsFlooding && i.rainNowMmHr < 2 ? 0.5 : 1;

  // age decay: linear to 0 over 6 h
  const ageDecay = Math.max(0, 1 - Math.max(0, i.ageMs) / REPORT_TTL_MS);

  const trust = confidence * corroboration * rainConsistency * ageDecay;
  return Math.round(Math.max(0, Math.min(1, trust)) * 1000) / 1000;
}

/** Derive report status from the vision output (contract: rejected / needs_review / verified / unverified). */
export function statusFrom(vision: VisionAnalysis): "verified" | "unverified" | "rejected" | "needs_review" {
  if (vision.confidence === 0 && vision.explanation.includes("Vision unavailable")) return "needs_review";
  if (!vision.isRoadScene) return "rejected";
  if (vision.confidence >= 0.7) return "verified";
  return "unverified";
}
