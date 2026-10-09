/**
 * Validate data/zones.geojson before seeding — P2's dry-run gate when P4's file lands.
 * Usage: npx tsx scripts/validate-zones-geojson.ts [path]
 * Exits non-zero on any problem. Does NOT write to DynamoDB.
 *
 * Checks exactly what P4 specified in her handoff:
 *  1. GeoJSON parses with FeatureCollection + Point geometry, [lng, lat] order
 *  2. 15 expected features (configurable via --expect)
 *  3. unique non-empty zoneId
 *  4. required fields present + typed (name, lat, lng, isUnderpass,
 *     depressionDepthM, drainageDeficit, historyScore, criticalRainMmHr)
 *  5. lat/lng finite and plausible for Delhi (lat in 28.4–28.8, lng in 76.9–77.4)
 *  6. drainageDeficit and historyScore in [0, 100]
 *  7. no writes performed — dry run only
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = process.argv[2] ?? join(root, "data", "zones.geojson");
const expect = Number(process.argv[process.argv.indexOf("--expect") + 1] ?? 15);

let ok = true;
const errors: string[] = [];
const warn = (m: string) => console.log(`  \x1b[33m!\x1b[0m ${m}`);

if (!existsSync(file)) {
  console.error(`\x1b[31mzones.geojson not found: ${file}\x1b[0m`);
  console.error("P4 must push data/zones.geojson before seeding.");
  process.exit(1);
}

let gj: any;
try { gj = JSON.parse(readFileSync(file, "utf8")); }
catch (e) { console.error(`\x1b[31mInvalid JSON: ${e}\x1b[0m`); process.exit(1); }

if (gj.type !== "FeatureCollection") { ok = false; errors.push("top-level type must be 'FeatureCollection'"); }
const features = Array.isArray(gj.features) ? gj.features : [];
if (features.length !== expect) { ok = false; errors.push(`expected ${expect} features, got ${features.length}`); }

const seen = new Set<string>();
features.forEach((f: any, i: number) => {
  const tag = `feature[${i}]`;
  if (f.type !== "Feature") { ok = false; errors.push(`${tag}: type must be 'Feature'`); return; }
  if (f.geometry?.type !== "Point") { ok = false; errors.push(`${tag}: geometry.type must be 'Point'`); return; }
  const [lng, lat] = f.geometry?.coordinates ?? [];
  if (typeof lng !== "number" || typeof lat !== "number") { ok = false; errors.push(`${tag}: geometry.coordinates must be [lng, lat] numbers`); return; }
  if (!(lat >= 28.4 && lat <= 28.8) || !(lng >= 76.9 && lng <= 77.4)) {
    ok = false; errors.push(`${tag}: coords (${lat}, ${lng}) not plausible for Delhi`);
  }
  const p = f.properties ?? {};
  const zid = p.zoneId ?? p.id;
  if (!String(zid ?? "").trim()) { ok = false; errors.push(`${tag}: missing id/zoneId`); }
  else if (seen.has(String(zid))) { ok = false; errors.push(`${tag}: duplicate zoneId ${zid}`); }
  seen.add(String(zid));
  for (const [k, check] of Object.entries<{ t: string; ok: (v: any) => boolean }>({
    name: { t: "string", ok: (v) => typeof v === "string" && v.length > 0 },
    isUnderpass: { t: "boolean", ok: (v) => typeof v === "boolean" },
    depressionDepthM: { t: "number", ok: (v) => typeof v === "number" && Number.isFinite(v) },
    drainageDeficit: { t: "0-100", ok: (v) => typeof v === "number" && v >= 0 && v <= 100 },
    historyScore: { t: "0-100", ok: (v) => typeof v === "number" && v >= 0 && v <= 100 },
    criticalRainMmHr: { t: "number", ok: (v) => typeof v === "number" && v > 0 },
  })) {
    if (!(k in p)) { ok = false; errors.push(`${tag}: missing ${k}`); }
    else if (!check.ok(p[k])) { ok = false; errors.push(`${tag}: ${k}=${JSON.stringify(p[k])} not ${check.t}`); }
  }
});

console.log(`\nValidating ${file} (expect ${expect} features)`);
if (ok && seen.size === expect) {
  console.log(`  \x1b[32m✓\x1b[0m  ${features.length} features, ${seen.size} unique IDs, all required fields typed correctly.\n`);
  console.log("  Dry run only — no writes performed. Safe to seed with `npm run seed -- --table Aquashield-Zones`.\n");
  process.exit(0);
}
console.error(`\x1b[31m✗ Invalid — ${errors.length} problem(s):\x1b[0m`);
errors.forEach((e) => console.error(`  - ${e}`));
console.error(`\n${seen.size}/${expect} unique feature IDs. Run an explicit Dry Run; no writes performed.\n`);
process.exit(1);
