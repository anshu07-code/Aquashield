/**
 * Unit tests for trust score function — matches the SHIPPED trust.ts contract
 * (TrustInputs: { vision, nearbyCount, rainNowMmHr, ageMs }).
 * Run: npx tsx --test services/api/src/vision/trust.test.ts
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeTrust,
  statusFrom,
  TRUST_TTL_MS,
  type TrustInputs,
} from "./trust.js";
import type { VisionAnalysis } from "@aquashield/types";

function makeVision(over: Partial<VisionAnalysis> = {}): VisionAnalysis {
  return {
    isRoadScene: true,
    floodedRoad: true,
    waterDepthTier: "knee",
    blockedDrain: false,
    debrisOrWasteObstruction: false,
    vehiclesStranded: false,
    confidence: 0.85,
    rejectReason: null,
    explanation: "Test flood report",
    ...over,
  };
}

function trustInputs(overrides: Partial<TrustInputs> = {}): TrustInputs {
  return {
    vision: makeVision(),
    nearbyCount: 0,
    rainNowMmHr: 5, // wet — no rain penalty by default
    ageMs: 0,
    ...overrides,
  };
}

test("base case: confident vision, no neighbours, wet, fresh", () => {
  // corroboration(0) = 0.7 → trust = 0.85 * 0.7 * 1.0 * 1.0 = 0.595
  assert.equal(computeTrust(trustInputs()), 0.595);
});

test("is bounded [0, 1]", () => {
  const maxed = trustInputs({ vision: makeVision({ confidence: 1.0 }) });
  assert.ok(computeTrust(maxed) <= 1.0);

  const zero = trustInputs({ vision: makeVision({ confidence: 0.0 }) });
  assert.ok(computeTrust(zero) >= 0.0);
});

test("clamps vision confidence to [0, 1]", () => {
  const over = trustInputs({ vision: makeVision({ confidence: 1.5 }) });
  assert.ok(computeTrust(over) <= 1.0);

  const under = trustInputs({ vision: makeVision({ confidence: -0.5 }) });
  assert.ok(computeTrust(under) >= 0.0);
});

test("age decay is 1.0 at age 0", () => {
  const inputs = trustInputs({ ageMs: 0 });
  assert.equal(computeTrust(inputs), 0.595);
});

test("age decay is 0.5 at age TTL/2", () => {
  const inputs = trustInputs({ ageMs: TRUST_TTL_MS / 2 });
  // trust = 0.85 * 0.7 * 1.0 * 0.5 = 0.2975 → rounds to 0.298
  assert.equal(computeTrust(inputs), 0.298);
});

test("age decay is 0.0 at age >= TTL", () => {
  const atTtl = trustInputs({ ageMs: TRUST_TTL_MS });
  assert.equal(computeTrust(atTtl), 0);

  const older = trustInputs({ ageMs: TRUST_TTL_MS * 2 });
  assert.equal(computeTrust(older), 0);
});

test("age decay is robust to negative age", () => {
  const inputs = trustInputs({ ageMs: -1000 });
  assert.equal(computeTrust(inputs), 0.595);
});

test("rain consistency is 1.0 when it is raining", () => {
  const inputs = trustInputs({ rainNowMmHr: 10 });
  assert.equal(computeTrust(inputs), 0.595);
});

test("rain consistency down-weights flood claims while dry", () => {
  const inputs = trustInputs({ rainNowMmHr: 0 }); // dry + floodedRoad → 0.5
  // trust = 0.85 * 0.7 * 0.5 * 1.0 = 0.2975 → 0.298
  assert.equal(computeTrust(inputs), 0.298);
});

test("rain consistency is 1.0 for blocked-drain (non-flood) claims while dry", () => {
  const inputs = trustInputs({
    rainNowMmHr: 0,
    vision: makeVision({ floodedRoad: false, waterDepthTier: "none", blockedDrain: true }),
  });
  assert.equal(computeTrust(inputs), 0.595);
});

test("corroboration raises trust with nearby reports", () => {
  const one = trustInputs({ nearbyCount: 1 }); // corr = 0.8
  assert.equal(computeTrust(one), 0.85 * 0.8);

  const three = trustInputs({ nearbyCount: 3 }); // corr = 1.0
  assert.equal(computeTrust(three), 0.85 * 1.0);
});

test("corroboration caps at 1.0", () => {
  const inputs = trustInputs({ nearbyCount: 20 });
  assert.equal(computeTrust(inputs), 0.85);
});

test("statusFrom: rejected when not a road scene", () => {
  assert.equal(statusFrom(makeVision({ isRoadScene: false, floodedRoad: false })), "rejected");
});

test("statusFrom: needs_review when vision unavailable", () => {
  const v = makeVision({ confidence: 0, explanation: "Vision unavailable (model not configured) — queued for manual review" });
  assert.equal(statusFrom(v), "needs_review");
});

test("statusFrom: verified at high confidence", () => {
  assert.equal(statusFrom(makeVision({ confidence: 0.85 })), "verified");
});

test("statusFrom: unverified at low confidence", () => {
  assert.equal(statusFrom(makeVision({ confidence: 0.3 })), "unverified");
});
