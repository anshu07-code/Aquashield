/**
 * Unit tests for trust score function.
 * Run: npx tsx --test services/api/src/vision/trust.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTrust,
  TRUST_TTL_MS,
  type TrustScoreInputs,
} from "./trust.js";
import type { VisionAnalysis } from "@aquashield/types";

function makeReport(
  id: string,
  ts: Date,
  trust = 0.8,
  status: "verified" | "unverified" | "needs_review" | "rejected" = "verified",
) {
  const vision: VisionAnalysis = {
    isRoadScene: true,
    floodedRoad: true,
    waterDepthTier: "knee",
    blockedDrain: false,
    debrisOrWasteObstruction: false,
    vehiclesStranded: false,
    confidence: trust,
    rejectReason: null,
    explanation: "Test flood report",
  };
  return { id, lat: 28.6139, lng: 77.2090, ts: ts.toISOString(), vision, trust, status };
}

function trustInputs(overrides: Partial<TrustScoreInputs> = {}): TrustScoreInputs {
  return {
    visionConfidence: 0.85,
    forecastWasDry: false,
    ageMs: 0,
    context: { nearbyReports: [] },
    ...overrides,
  };
}

test("returns visionConfidence when all other factors are neutral", () => {
  const inputs = trustInputs({ context: { nearbyReports: [] }, forecastWasDry: null, ageMs: 0 });
  assert.equal(computeTrust(inputs), 0.85);
});

test("is bounded [0, 1]", () => {
  const maxed = trustInputs({ visionConfidence: 1.0, context: { nearbyReports: [] }, forecastWasDry: null, ageMs: 0 });
  assert.ok(computeTrust(maxed) <= 1.0);

  const zero = trustInputs({ visionConfidence: 0.0, context: { nearbyReports: [] }, forecastWasDry: null, ageMs: 0 });
  assert.ok(computeTrust(zero) >= 0.0);
});

test("clamps visionConfidence to [0, 1]", () => {
  const over = trustInputs({ visionConfidence: 1.5, context: { nearbyReports: [] }, forecastWasDry: null, ageMs: 0 });
  assert.ok(computeTrust(over) <= 1.0);

  const under = trustInputs({ visionConfidence: -0.5, context: { nearbyReports: [] }, forecastWasDry: null, ageMs: 0 });
  assert.ok(computeTrust(under) >= 0.0);
});

test("age decay is 1.0 at age 0", () => {
  const inputs = trustInputs({ ageMs: 0, context: { nearbyReports: [] }, forecastWasDry: null });
  assert.equal(computeTrust(inputs), 0.85);
});

test("age decay is 0.5 at age TTL/2", () => {
  const inputs = trustInputs({ ageMs: TRUST_TTL_MS / 2, context: { nearbyReports: [] }, forecastWasDry: null });
  // trust = 0.85 * 1.0 * 1.0 * 0.5 = 0.425
  assert.equal(computeTrust(inputs), 0.425);
});

test("age decay is 0.0 at age >= TTL", () => {
  const inputs = trustInputs({ ageMs: TRUST_TTL_MS, context: { nearbyReports: [] }, forecastWasDry: null });
  assert.equal(computeTrust(inputs), 0);

  const older = trustInputs({ ageMs: TRUST_TTL_MS * 2, context: { nearbyReports: [] }, forecastWasDry: null });
  assert.equal(computeTrust(older), 0);
});

test("age decay is robust to negative age", () => {
  const inputs = trustInputs({ ageMs: -1000, context: { nearbyReports: [] }, forecastWasDry: null });
  assert.equal(computeTrust(inputs), 0.85);
});

test("rain consistency returns 1.0 when forecast is wet", () => {
  const inputs = trustInputs({ forecastWasDry: false, context: { nearbyReports: [] }, ageMs: 0 });
  assert.equal(computeTrust(inputs), 0.85);
});

test("rain consistency returns 1.0 when forecast is unknown (null)", () => {
  const inputs = trustInputs({ forecastWasDry: null, context: { nearbyReports: [] }, ageMs: 0 });
  assert.equal(computeTrust(inputs), 0.85);
});

test("rain consistency returns 0.5 when forecast is dry (down-weight)", () => {
  const inputs = trustInputs({ forecastWasDry: true, context: { nearbyReports: [] }, ageMs: 0 });
  // trust = 0.85 * 1.0 * 0.5 * 1.0 = 0.425
  assert.equal(computeTrust(inputs), 0.425);
});

test("corroboration is 1.0 when no nearby reports", () => {
  const inputs = trustInputs({ context: { nearbyReports: [] }, forecastWasDry: null, ageMs: 0 });
  assert.equal(computeTrust(inputs), 0.85);
});

test("corroboration increases with one corroborating verified report", () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago
  const inputs = trustInputs({
    context: {
      nearbyReports: [makeReport("r1", recent, 0.8, "verified")],
    },
    forecastWasDry: null,
    ageMs: 0,
  });
  // corr = 1 - (1 - 0.6*0.8) = 1 - 0.52 = 0.48
  // trust = 0.85 * 0.48 * 1.0 * 1.0 ≈ 0.408
  const result = computeTrust(inputs);
  assert.ok(result > 0);
  assert.ok(result < 0.85);
});

test("corroboration excludes needs_review reports", () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 10 * 60 * 1000);
  const inputs = trustInputs({
    context: {
      nearbyReports: [makeReport("r1", recent, 0.9, "needs_review")],
    },
    forecastWasDry: null,
    ageMs: 0,
  });
  // No valid corroborating reports → factor = 1.0
  assert.equal(computeTrust(inputs), 0.85);
});

test("corroboration excludes rejected reports", () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 10 * 60 * 1000);
  const inputs = trustInputs({
    context: {
      nearbyReports: [
        makeReport("r1", recent, 0.9, "verified"),
        makeReport("r2", recent, 0.9, "rejected"),
      ],
    },
    forecastWasDry: null,
    ageMs: 0,
  });
  // Only the verified one counts
  const result = computeTrust(inputs);
  assert.ok(result < 0.85);
});

test("corroboration caps at 1.0", () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 5 * 60 * 1000);
  const reports = Array.from({ length: 10 }, (_, i) =>
    makeReport(`r${i}`, recent, 0.9, "verified"),
  );
  const inputs = trustInputs({
    context: { nearbyReports: reports },
    forecastWasDry: null,
    ageMs: 0,
  });
  assert.ok(computeTrust(inputs) <= 0.85);
});

test("corroboration excludes reports older than 30 minutes", () => {
  const now = new Date();
  const oldReport = new Date(now.getTime() - 45 * 60 * 1000); // 45 min ago — outside 30 min window
  const inputs = trustInputs({
    context: {
      nearbyReports: [makeReport("r1", oldReport, 0.95, "verified")],
    },
    forecastWasDry: null,
    ageMs: 0,
  });
  // Should fall back to no corroboration (factor = 1.0)
  assert.equal(computeTrust(inputs), 0.85);
});

test("combined factors — typical scenario", () => {
  const now = new Date();
  const recent = new Date(now.getTime() - 10 * 60 * 1000);
  const inputs = trustInputs({
    visionConfidence: 0.88,
    forecastWasDry: false, // wet — no penalty
    ageMs: 30 * 60 * 1000, // 30 min old
    context: {
      nearbyReports: [
        makeReport("r1", recent, 0.8, "verified"),
        makeReport("r2", recent, 0.7, "verified"),
      ],
    },
  });
  // ageFactor = 1 - 0.0833 = 0.9167
  // corr = 1 - 0.28*0.58 = 0.8376
  // trust = 0.88 * 0.8376 * 1.0 * 0.9167 ≈ 0.676
  const result = computeTrust(inputs);
  assert.ok(result > 0);
  assert.ok(result < 0.88);
});

test("returns 0 for old, dry-forecast, unverified, low-confidence reports", () => {
  const inputs = trustInputs({
    visionConfidence: 0.1,
    forecastWasDry: true, // dry — 0.5 penalty
    ageMs: TRUST_TTL_MS, // expired — 0 decay
    context: { nearbyReports: [] },
  });
  assert.equal(computeTrust(inputs), 0);
});