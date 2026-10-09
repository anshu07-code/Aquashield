/**
 * Ingest Lambda — runs every 15 min (EventBridge, defined in infra/template.yaml).
 *
 * For each zone:
 *   1. fetch Open-Meteo forecast (15-min precipitation + past 24 h rain)   [real data]
 *   2. gather trust of active non-rejected reports in the zone            [real data]
 *   3. computeRisk + computeEta via @aquashield/risk-core                 [shared engine]
 *   4. write RiskSnapshot (TTL 48 h) + update the Zone's latest risk
 *
 * On Open-Meteo failure: keep the previous values, set stale=true (UI shows a badge).
 * This Lambda is the ONLY caller of Open-Meteo (never the browser) — AGENTS.md rule 7.
 */
import { computeRisk, computeEta, type ZoneStatic } from "@aquashield/risk-core";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const ZonesTable = required("TABLE_ZONES");
const SnapshotsTable = required("TABLE_SNAPSHOTS");
const ReportsTable = required("TABLE_REPORTS");
const FORECAST_TTL_S = 48 * 3600;

function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
}

interface ZoneRow {
  zoneId: string;
  name: string;
  lat: number;
  lng: number;
  isUnderpass: boolean;
  depressionDepthM: number;
  drainageDeficit: number;
  historyScore: number;
  criticalRainMmHr: number;
}

interface ForecastPoint15 {
  ts: string;
  mmHr: number;
}

/**
 * Open-Meteo call. Prefer minutely_15 (15-min steps for ETA); fall back to hourly.
 * Returns next-3h forecast points, current rain, and past-24 h total (mm).
 */
async function fetchForecast(lat: number, lng: number): Promise<{
  forecast: ForecastPoint15[];
  rainNowMmHr: number;
  rain24hMm: number;
}> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&hourly=precipitation&minutely_15=precipitation` +
    `&past_days=1&forecast_days=1&timezone=UTC`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const data = (await res.json()) as {
    hourly?: { time: string[]; precipitation: (number | null)[] };
    minutely_15?: { time: string[]; precipitation: (number | null)[] };
  };

  const nowMs = Date.now();

  // past 24 h total from hourly series
  let rain24hMm = 0;
  const hourly = data.hourly;
  if (hourly) {
    for (let i = 0; i < hourly.time.length; i++) {
      const t = Date.parse(hourly.time[i] + "Z");
      if (t >= nowMs - 24 * 3600_000 && t <= nowMs) rain24hMm += hourly.precipitation[i] ?? 0;
    }
  }

  // next 3 h at 15-min steps (minutely_15 preferred, hourly fallback)
  const forecast: ForecastPoint15[] = [];
  const m = data.minutely_15;
  if (m) {
    for (let i = 0; i < m.time.length; i++) {
      const ts = m.time[i] + "Z";
      const t = Date.parse(ts);
      if (t > nowMs && t <= nowMs + 3 * 3600_000) forecast.push({ ts, mmHr: m.precipitation[i] ?? 0 });
    }
  }
  if (!forecast.length && hourly) {
    for (let i = 0; i < hourly.time.length; i++) {
      const ts = hourly.time[i] + "Z";
      const t = Date.parse(ts);
      if (t > nowMs && t <= nowMs + 3 * 3600_000) forecast.push({ ts, mmHr: hourly.precipitation[i] ?? 0 });
    }
  }

  const rainNowMmHr = forecast[0]?.mmHr ?? 0;
  return { forecast: forecast.slice(0, 13), rainNowMmHr: Math.round(rainNowMmHr * 10) / 10, rain24hMm: Math.round(rain24hMm * 10) / 10 };
}

async function scanAll(tableName: string): Promise<ZoneRow[]> {
  const items: ZoneRow[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey }));
    items.push(...((res.Items ?? []) as ZoneRow[]));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Trusts of active, non-rejected reports for one zone. */
async function reportTrusts(zoneId: string): Promise<number[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: ReportsTable,
      KeyConditionExpression: "zoneId = :z",
      ExpressionAttributeValues: { ":z": zoneId },
    }),
  );
  const nowS = Math.floor(Date.now() / 1000);
  return ((res.Items ?? []) as Array<{ ttl: number; trust: number; status: string }>)
    .filter((r) => r.ttl > nowS && r.status !== "rejected")
    .map((r) => r.trust);
}

export const handler = async (): Promise<{ ok: boolean; zones: number; stale: number; errors: number }> => {
  const zones = (await scanAll(ZonesTable)) as ZoneRow[];
  let stale = 0;
  let errors = 0;

  for (const z of zones) {
    const ts = new Date().toISOString();
    const ttl = Math.floor(Date.now() / 1000) + FORECAST_TTL_S;
    try {
      const [{ forecast, rainNowMmHr, rain24hMm }, trusts] = await Promise.all([
        fetchForecast(z.lat, z.lng),
        reportTrusts(z.zoneId),
      ]);
      const live = { rainNowMmHr, rain24hMm, reportTrusts: trusts };
      const stat: ZoneStatic = {
        isUnderpass: z.isUnderpass,
        depressionDepthM: z.depressionDepthM,
        drainageDeficit: z.drainageDeficit,
        historyScore: z.historyScore,
        criticalRainMmHr: z.criticalRainMmHr,
      };
      const breakdown = computeRisk(stat, live, null);
      const etaMin = computeEta(stat, live, forecast);

      await ddb.send(new PutCommand({
        TableName: SnapshotsTable,
        Item: {
          zoneId: z.zoneId,
          ts,
          ttl,
          risk: breakdown.risk,
          tier: breakdown.tier,
          etaMin,
          factors: breakdown.factors,
          contributions: breakdown.contributions,
          underpassMultiplier: breakdown.underpassMultiplier,
          topReasons: breakdown.topReasons,
          rainNowMmHr,
          rain24hMm,
          forecast,
          stale: false,
        },
      }));
      await ddb.send(new UpdateCommand({
        TableName: ZonesTable,
        Key: { zoneId: z.zoneId },
        UpdateExpression: "SET #r = :r, tier = :t, etaMin = :e, updatedAt = :u, stale = :s",
        ExpressionAttributeNames: { "#r": "risk" },
        ExpressionAttributeValues: { ":r": breakdown.risk, ":t": breakdown.tier, ":e": etaMin, ":u": ts, ":s": false },
      }));
    } catch (e) {
      // Open-Meteo (or DDB) failed for this zone: keep previous values, flag stale.
      stale++;
      errors++;
      console.error(JSON.stringify({ zone: z.zoneId, stale: true, err: e instanceof Error ? e.message : String(e) }));
      try {
        await ddb.send(new UpdateCommand({
          TableName: ZonesTable,
          Key: { zoneId: z.zoneId },
          UpdateExpression: "SET stale = :s",
          ExpressionAttributeValues: { ":s": true },
        }));
      } catch { /* best effort */ }
    }
  }

  const summary = { ok: true, zones: zones.length, stale, errors, at: new Date().toISOString() };
  console.log(JSON.stringify(summary));
  return { ok: true, zones: zones.length, stale, errors };
};
