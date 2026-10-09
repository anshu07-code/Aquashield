/**
 * GET /health · GET /zones · GET /zones/{id}
 * Reads: Zones table, latest RiskSnapshots, active Reports.
 * Zone summary shape must match ZoneSummarySchema; detail matches ZoneDetailSchema.
 */
import {
  ZoneListResponseSchema,
  ZoneDetailSchema,
  RiskBreakdownSchema,
  type ZoneSummary,
} from "@aquashield/types";
import { computeRisk, tierFor, type ZoneStatic } from "@aquashield/risk-core";
import { route, ok, raw, notFound, type ReqEvent, type Res } from "../shared/http.ts";
import { getZone, scanZones, latestSnapshot, activeReports, type ZoneItem, type SnapshotItem } from "../shared/db.ts";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

function toSummary(z: ZoneItem): ZoneSummary {
  return {
    id: z.zoneId,
    name: z.name,
    lat: z.lat,
    lng: z.lng,
    isUnderpass: z.isUnderpass,
    risk: z.risk ?? 0,
    tier: z.tier ?? tierFor(z.risk ?? 0),
    etaMin: z.etaMin ?? null,
    updatedAt: z.updatedAt ?? new Date(0).toISOString(),
    stale: z.stale ?? true, // no forecast yet -> stale badge
  };
}

function staticOf(z: ZoneItem): ZoneStatic {
  return {
    isUnderpass: z.isUnderpass,
    depressionDepthM: z.depressionDepthM,
    drainageDeficit: z.drainageDeficit,
    historyScore: z.historyScore,
    criticalRainMmHr: z.criticalRainMmHr,
  };
}

/**
 * If there is no snapshot yet (ingest has not run), compute a baseline breakdown from
 * static attributes with zero live rain, flagged stale. The UI always gets valid numbers.
 */
function baselineBreakdown(z: ZoneItem) {
  const live = { rainNowMmHr: 0, rain24hMm: 0, reportTrusts: [] as number[] };
  const b = computeRisk(staticOf(z), live, null);
  return { ...b, stale: true };
}

function breakdownOf(snap: SnapshotItem | undefined, z: ZoneItem) {
  if (!snap) return baselineBreakdown(z);
  return RiskBreakdownSchema.parse({
    risk: snap.risk,
    tier: snap.tier,
    etaMin: snap.etaMin,
    factors: snap.factors,
    contributions: snap.contributions,
    underpassMultiplier: snap.underpassMultiplier,
    topReasons: snap.topReasons,
  });
}

async function listZones(): Promise<Res> {
  const zones = (await scanZones()).map(toSummary);
  zones.sort((a, b) => b.risk - a.risk);
  return ok(ZoneListResponseSchema, { zones });
}

async function zoneDetail(event: ReqEvent): Promise<Res> {
  const id = event.pathParameters?.id;
  if (!id) throw notFound("Zone");
  const zone = await getZone(id);
  if (!zone) throw notFound("Zone");

  const [snap, reportsRaw] = await Promise.all([latestSnapshot(id), activeReports(id)]);

  // forecast: next 3 h from the snapshot (12 x 15-min steps)
  const nowMs = Date.now();
  const forecast = (snap?.forecast ?? [])
    .filter((p) => Date.parse(p.ts) > nowMs)
    .slice(0, 12);

  // reports: exclude rejected; sign short-lived GET URLs when a photo exists
  const reports = await Promise.all(
    reportsRaw
      .filter((r) => r.status !== "rejected")
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .map(async (r) => {
        let imageUrl: string | null = null;
        if (r.imageKey && process.env.MEDIA_BUCKET) {
          try {
            imageUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.MEDIA_BUCKET, Key: r.imageKey }), { expiresIn: 600 });
          } catch { imageUrl = null; }
        }
        return {
          id: r.id,
          zoneId: r.zoneId,
          ts: r.ts,
          type: r.type,
          imageUrl,
          note: r.note ?? null,
          vision: r.vision,
          trust: r.trust,
          status: r.status,
        };
      }),
  );

  const body = {
    zone: toSummary(zone),
    breakdown: breakdownOf(snap, zone),
    rain: { nowMmHr: snap?.rainNowMmHr ?? 0, last24hMm: snap?.rain24hMm ?? 0 },
    forecast,
    reports,
  };
  return ok(ZoneDetailSchema, body);
}

export const handler = route(async (event: ReqEvent): Promise<Res> => {
  const method = event.requestContext.http.method;
  if (method === "GET" && event.rawPath === "/health") {
    return raw({ ok: true, time: new Date().toISOString() });
  }
  if (method === "GET" && event.rawPath === "/zones") return listZones();
  return zoneDetail(event); // GET /zones/{id}
});
