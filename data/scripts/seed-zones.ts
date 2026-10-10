/**
 * data/scripts/seed-zones.ts
 * =============================
 * Seeds the Zones DynamoDB table from data/zones.geojson.
 *
 * Usage:
 *   # Dry-run (validates records, no writes):
 *   npx tsx data/scripts/seed-zones.ts --dry-run
 *
 *   # Production (requires ZONES_TABLE env var and valid AWS credentials):
 *   npx tsx data/scripts/seed-zones.ts --table $ZONES_TABLE
 *
 * Environment variables:
 *   ZONES_TABLE          — DynamoDB table name (required for non-dry-run)
 *   AWS_REGION            — AWS region (default: ap-south-1)
 *   AWS_PROFILE           — Named AWS profile (default: default)
 *   AWS_ACCESS_KEY_ID     — Overrides profile (for CI/CD only)
 *   AWS_SECRET_ACCESS_KEY — Overrides profile (for CI/CD only)
 *
 * Notes:
 *   - NEVER run against a production table without explicit confirmation.
 *   - Credentials are read from the environment or ~/.aws/credentials.
 *   - No secrets are printed to stdout.
 *   - All records are validated before upload.
 *   - Uses PutItem with condition: attribute_not_exists(pk) to avoid overwrites.
 *
 * P2 owns the DynamoDB schema. The table must exist before seeding.
 * If the table name is not known, run with --dry-run first to validate the data.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------- Args & env ----------

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const tableArgIdx = args.indexOf("--table");
const envTableIdx = args.indexOf("--env-table");

let tableName: string | undefined;

if (tableArgIdx !== -1 && args[tableArgIdx + 1]) {
  tableName = args[tableArgIdx + 1];
} else if (envTableIdx !== -1 && args[envTableIdx + 1]) {
  tableName = process.env[args[envTableIdx + 1]];
}

tableName ??= process.env.ZONES_TABLE;

if (!dryRun && !tableName) {
  console.error("ERROR: Table name required. Pass --table <name> or set ZONES_TABLE env var.");
  console.error("       Use --dry-run to validate without writing to DynamoDB.");
  process.exit(1);
}

// ---------- Validation types ----------

interface ZoneFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    isUnderpass: boolean;
    depressionDepthM: number;
    drainageDeficit: number;
    historyScore: number;
    criticalRainMmHr: number;
    source?: string;
    dataQuality?: string;
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: ZoneFeature[];
}

// ---------- Load & parse GeoJSON ----------

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const geojsonPath = join(__dirname, "..", "zones.geojson");

let geojson: GeoJSON;

try {
  geojson = JSON.parse(readFileSync(geojsonPath, "utf8")) as GeoJSON;
} catch (err) {
  console.error(`ERROR: Could not read ${geojsonPath}:`, (err as Error).message);
  process.exit(1);
}

if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) {
  console.error("ERROR: Invalid GeoJSON — expected FeatureCollection with features array.");
  process.exit(1);
}

console.log(`\nLoaded ${geojson.features.length} zones from ${geojsonPath}`);

// ---------- Validate each record ----------

function validateZone(f: ZoneFeature, index: number): string | null {
  const p = f.properties;
  if (!f.id || !p.name) return `Feature[${index}]: missing id or name`;
  if (typeof p.lat !== "number" || p.lat < -90 || p.lat > 90)
    return `Feature[${index}] "${p.name}": invalid lat ${p.lat}`;
  if (typeof p.lng !== "number" || p.lng < -180 || p.lng > 180)
    return `Feature[${index}] "${p.name}": invalid lng ${p.lng}`;
  if (typeof p.isUnderpass !== "boolean")
    return `Feature[${index}] "${p.name}": isUnderpass must be boolean`;
  if (typeof p.depressionDepthM !== "number" || p.depressionDepthM < 0 || p.depressionDepthM > 15)
    return `Feature[${index}] "${p.name}": depressionDepthM out of range 0-15`;
  if (typeof p.drainageDeficit !== "number" || p.drainageDeficit < 0 || p.drainageDeficit > 100)
    return `Feature[${index}] "${p.name}": drainageDeficit must be 0-100`;
  if (typeof p.historyScore !== "number" || p.historyScore < 0 || p.historyScore > 100)
    return `Feature[${index}] "${p.name}": historyScore must be 0-100`;
  if (typeof p.criticalRainMmHr !== "number" || p.criticalRainMmHr < 5 || p.criticalRainMmHr > 150)
    return `Feature[${index}] "${p.name}": criticalRainMmHr out of range`;
  return null;
}

const validZones: ZoneFeature[] = [];
const errors: string[] = [];

for (let i = 0; i < geojson.features.length; i++) {
  const f = geojson.features[i];
  const err = validateZone(f, i);
  if (err) {
    errors.push(err);
  } else {
    validZones.push(f);
  }
}

if (errors.length > 0) {
  console.error("\nValidation ERRORS:");
  errors.forEach((e) => console.error("  " + e));
  process.exit(1);
}

console.log(`Validated: ${validZones.length}/${geojson.features.length} zones OK`);

// ---------- Print summary ----------

console.log("\nZone summary:");
for (const f of validZones) {
  const p = f.properties;
  const coordQual = (p.dataQuality || "").includes("coordinates: VERIFIED") ? "✓" : "~";
  console.log(
    `  ${coordQual} ${p.id} | ${p.name.padEnd(35)} | underpass=${p.isUnderpass} | ` +
    `depression=${p.depressionDepthM}m | criticalRain=${p.criticalRainMmHr}mm/h | quality=${p.dataQuality || "N/A"}`
  );
}

// ---------- DynamoDB write (skip in dry-run) ----------

if (dryRun) {
  console.log("\n✓ DRY RUN — no records written to DynamoDB.");
  console.log(`  Pass --table ${tableName || "<ZonesTable>"} to seed.`);
  process.exit(0);
}

async function main(): Promise<void> {
  // Load AWS SDK v3 via createRequire: @aws-sdk/lib-dynamodb's named exports are NOT
  // visible to ESM dynamic import under tsx (CJS interop), which made PutItemCommand
  // undefined at runtime ("not a constructor"). createRequire is deterministic for CJS.
  // Fixed 2026-10-10 while seeding the live table (P4: keep on next regen).
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { DynamoDBClient, PutItemCommand } = require("@aws-sdk/client-dynamodb") as typeof import("@aws-sdk/client-dynamodb");
  const { marshall } = require("@aws-sdk/util-dynamodb") as typeof import("@aws-sdk/util-dynamodb");

  const region = process.env.AWS_REGION || "ap-south-1";

  const clientConfig: { region: string } = { region };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig["credentials"] = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const client = new DynamoDBClient(clientConfig);

  console.log(`\nSeeding to table: ${tableName}`);
  console.log(`Region: ${region}`);
  console.log("Press Ctrl+C to abort, or wait 3 seconds to continue...\n");

  await new Promise((r) => setTimeout(r, 3000));

  let success = 0;
  let failed = 0;
  const failedZones: string[] = [];

  for (const f of validZones) {
    const p = f.properties;
    const item = {
      zoneId: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      isUnderpass: p.isUnderpass,
      depressionDepthM: p.depressionDepthM,
      drainageDeficit: p.drainageDeficit,
      historyScore: p.historyScore,
      criticalRainMmHr: p.criticalRainMmHr,
      source: p.source || "",
      dataQuality: p.dataQuality || "",
      // Geometry stored as GeoJSON Point for potential GeoSPARQL queries
      geometry: f.geometry,
      createdAt: new Date().toISOString(),
    };

    try {
      await client.send(
        new PutItemCommand({
          TableName: tableName,
          Item: marshall(item, { removeUndefinedValues: true }),
          ConditionExpression: "attribute_not_exists(zoneId)",
        })
      );
      success++;
      process.stdout.write(`✓ ${p.id}\n`);
    } catch (err: unknown) {
      failed++;
      failedZones.push(p.id);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("ConditionalCheckFailed")) {
        console.error(`✗ ${p.id} — ALREADY EXISTS (skipping, use update instead)`);
      } else {
        console.error(`✗ ${p.id} — ${msg}`);
      }
    }
  }

  console.log(`\nSeed complete: ${success} written, ${failed} failed`);

  if (failedZones.length > 0) {
    console.log(`Failed zones: ${failedZones.join(", ")}`);
    console.log("Tip: Delete existing records or use UpdateItem instead of PutItem to update.");
  }

  if (success > 0) {
    console.log(`\nRun the ingest Lambda to compute initial RiskSnapshots for all ${success} zones.`);
  }
}

main().catch((err: unknown) => {
  console.error("Seeding failed:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
