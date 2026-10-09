/**
 * Seed the Zones table — run AFTER `sam deploy` (needs the deployed table name).
 *
 *   npm run seed -- --table <ZonesTableName>
 *   # or with AWS CLI profile configured:
 *   npm run seed -- --table $(aws cloudformation describe-stacks --stack-name aquashield --query "Stacks[0].Outputs[?OutputKey=='RegionsTable'].OutputValue" --output text)
 *
 * Zone attributes come from data/zones.geojson when P4's pipeline has produced it,
 * otherwise from mocks/zones.json with documented placeholder attributes (labelled SIMULATION
 * in the UI/README until real data lands).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

function envTable(): string {
  const fromArg = process.argv.indexOf("--table");
  if (fromArg > -1 && process.argv[fromArg + 1]) return process.argv[fromArg + 1];
  if (process.env.TABLE_ZONES) return process.env.TABLE_ZONES;
  throw new Error("Pass --table <ZonesTableName> or set TABLE_ZONES");
}

interface SeedZone {
  zoneId: string;
  name: string;
  lat: number;
  lng: number;
  isUnderpass: boolean;
  depressionDepthM: number;
  drainageDeficit: number;
  historyScore: number;
  criticalRainMmHr: number;
  seeded: string;
}

/** Placeholder static attributes until P4's zones.geojson lands (label as SIMULATION in UI). */
function defaultsFor(isUnderpass: boolean) {
  return isUnderpass
    ? { depressionDepthM: 4, drainageDeficit: 75, historyScore: 55, criticalRainMmHr: 40 }
    : { depressionDepthM: 1, drainageDeficit: 50, historyScore: 35, criticalRainMmHr: 60 };
}

function fromGeojson(): SeedZone[] | null {
  const p = join(root, "data", "zones.geojson");
  if (!existsSync(p)) return null;
  const gj = JSON.parse(readFileSync(p, "utf8")) as {
    features: Array<{
      geometry: { type: string; coordinates: [number, number] };
      properties: Record<string, unknown>;
    }>;
  };
  return gj.features.map((f, i) => {
    const props = f.properties ?? {};
    const isUnderpass = Boolean(props.isUnderpass ?? false);
    return {
      zoneId: String(props.id ?? props.zoneId ?? `z_${i}`),
      name: String(props.name ?? `Zone ${i}`),
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      isUnderpass,
      depressionDepthM: Number(props.depressionDepthM ?? defaultsFor(isUnderpass).depressionDepthM),
      drainageDeficit: Number(props.drainageDeficit ?? defaultsFor(isUnderpass).drainageDeficit),
      historyScore: Number(props.historyScore ?? defaultsFor(isUnderpass).historyScore),
      criticalRainMmHr: Number(props.criticalRainMmHr ?? defaultsFor(isUnderpass).criticalRainMmHr),
      seeded: "data/zones.geojson",
    };
  });
}

function fromMocks(): SeedZone[] {
  const p = join(root, "mocks", "zones.json");
  const mocks = JSON.parse(readFileSync(p, "utf8")) as {
    zones: Array<{ id: string; name: string; lat: number; lng: number; isUnderpass: boolean; risk?: number; tier?: string }>;
  };
  return mocks.zones.map((z) => ({
    zoneId: z.id,
    name: z.name,
    lat: z.lat,
    lng: z.lng,
    isUnderpass: z.isUnderpass,
    ...defaultsFor(z.isUnderpass),
    seeded: "mocks/zones.json (placeholder attributes — replaced by data/zones.geojson)",
  }));
}

async function main() {
  const table = envTable();
  const zones = fromGeojson() ?? fromMocks();
  const source = fromGeojson() ? "data/zones.geojson" : "mocks/zones.json";
  console.log(`Seeding ${zones.length} zones from ${source} into ${table}`);

  let written = 0;
  for (const z of zones) {
    await ddb.send(new PutCommand({ TableName: table, Item: z }));
    written++;
  }
  console.log(`Done. Wrote ${written} zones.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
