import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRisk, computeEta, tierFor, type ZoneStatic } from "../src/index.ts";

const underpass: ZoneStatic = { isUnderpass: true, depressionDepthM: 4.5, drainageDeficit: 80, historyScore: 60, criticalRainMmHr: 40 };
const dry = { rainNowMmHr: 0, rain24hMm: 0, reportTrusts: [] };

test("tier boundaries", () => {
  assert.equal(tierFor(29), "SAFE");
  assert.equal(tierFor(30), "WATCH");
  assert.equal(tierFor(54), "WATCH");
  assert.equal(tierFor(55), "HIGH");
  assert.equal(tierFor(74), "HIGH");
  assert.equal(tierFor(75), "CRITICAL");
});

test("risk is monotonic in rainfall", () => {
  let prev = -1;
  for (const r of [0, 10, 20, 40, 60, 80]) {
    const risk = computeRisk(underpass, { ...dry, rainNowMmHr: r }).risk;
    assert.ok(risk >= prev);
    prev = risk;
  }
});

test("risk stays within 0-100", () => {
  const extreme = computeRisk(underpass, { rainNowMmHr: 500, rain24hMm: 500, reportTrusts: [1, 1, 1, 1] });
  assert.ok(extreme.risk <= 100 && extreme.risk >= 0);
});

test("verified reports raise risk", () => {
  const base = computeRisk(underpass, { ...dry, rainNowMmHr: 30 }).risk;
  const withReports = computeRisk(underpass, { rainNowMmHr: 30, rain24hMm: 0, reportTrusts: [0.9, 0.8] }).risk;
  assert.ok(withReports > base);
});

test("underpass multiplier applies", () => {
  const flat = { ...underpass, isUnderpass: false };
  const live = { rainNowMmHr: 40, rain24hMm: 20, reportTrusts: [] };
  assert.ok(computeRisk(underpass, live).risk >= computeRisk(flat, live).risk);
});

test("contributions sum to raw score", () => {
  const b = computeRisk({ ...underpass, isUnderpass: false }, { rainNowMmHr: 30, rain24hMm: 40, reportTrusts: [0.7] });
  const sum = Object.values(b.contributions).reduce((a, c) => a + c, 0);
  assert.ok(Math.abs(sum - b.risk) <= 1.5);
});

test("ETA: already critical returns 0", () => {
  const live = { rainNowMmHr: 80, rain24hMm: 90, reportTrusts: [0.9, 0.9] };
  assert.equal(computeEta(underpass, live, []), 0);
});

test("ETA: finds first critical step in forecast", () => {
  const now = Date.parse("2026-10-09T10:00:00Z");
  const fc = [
    { ts: "2026-10-09T10:15:00Z", mmHr: 5 },
    { ts: "2026-10-09T10:30:00Z", mmHr: 60 },
    { ts: "2026-10-09T10:45:00Z", mmHr: 90 },
  ];
  const live = { rainNowMmHr: 2, rain24hMm: 60, reportTrusts: [0.8] };
  const eta = computeEta(underpass, live, fc, now);
  assert.ok(eta === 30 || eta === 45, `got ${eta}`);
});

test("ETA: null when dry forecast", () => {
  const now = Date.parse("2026-10-09T10:00:00Z");
  const fc = [{ ts: "2026-10-09T10:15:00Z", mmHr: 0 }];
  assert.equal(computeEta(underpass, dry, fc, now), null);
});
