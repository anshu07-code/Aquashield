/**
 * POST /reports/presign · POST /reports · GET /reports?zoneId=
 *
 * Flow (docs/CONTRACT.md):
 *   1. client POSTs /reports/presign -> { uploadUrl, key }
 *   2. client PUTs the file to uploadUrl with the same Content-Type (max 5 MB, jpeg/png/webp)
 *   3. client POSTs /reports -> Lambda validates, runs Bedrock vision (P3 module),
 *      computes trust, stores with 6 h TTL, recomputes zone risk, returns old -> new.
 *
 * zoneId may be omitted: the report snaps to the nearest zone within 300 m,
 * otherwise 422 NO_ZONE_NEARBY.
 */
import { randomUUID } from "node:crypto";
import {
  PresignRequestSchema,
  PresignResponseSchema,
  CreateReportRequestSchema,
  CreateReportResponseSchema,
  ReportsListSchema,
} from "@aquashield/types";
import { computeRisk, type ZoneStatic } from "@aquashield/risk-core";
import {
  route, ok, parseBody, validation, noZoneNearby, notFound, imageRejected,
  type ReqEvent, type Res,
} from "../shared/http.ts";
import {
  ddb, Tables, getZone, scanZones, activeReports, putReport, putZoneRisk, putSnapshot,
  latestSnapshot, type ZoneItem, type ReportItem,
} from "../shared/db.ts";
import { haversineM } from "../shared/geo.ts";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { analyzeImage } from "../vision/index.ts";
import { computeTrust, statusFrom } from "../vision/trust.ts";

const s3 = new S3Client({});
const REPORT_TTL_S = 6 * 60 * 60; // 6 h (DynamoDB TTL)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const SNAP_RADIUS_M = 300;   // report -> zone snapping
const EVIDENCE_RADIUS_M = 150; // corroboration radius

const bucket = (): string => {
  const b = process.env.MEDIA_BUCKET;
  if (!b) throw new Error("MEDIA_BUCKET not set");
  return b;
};

function staticOf(z: ZoneItem): ZoneStatic {
  return {
    isUnderpass: z.isUnderpass,
    depressionDepthM: z.depressionDepthM,
    drainageDeficit: z.drainageDeficit,
    historyScore: z.historyScore,
    criticalRainMmHr: z.criticalRainMmHr,
  };
}

/** Find zone by id, else nearest within 300 m, else 422 NO_ZONE_NEARBY. */
async function resolveZone(req: { zoneId?: string; lat: number; lng: number }): Promise<ZoneItem> {
  if (req.zoneId) {
    const z = await getZone(req.zoneId);
    if (!z) throw notFound("Zone");
    return z;
  }
  const zones = await scanZones();
  let best: ZoneItem | undefined;
  let bestD = Infinity;
  for (const z of zones) {
    const d = haversineM({ lat: req.lat, lng: req.lng }, { lat: z.lat, lng: z.lng });
    if (d < bestD) { bestD = d; best = z; }
  }
  if (!best || bestD > SNAP_RADIUS_M) throw noZoneNearby();
  return best;
}

async function presign(event: ReqEvent): Promise<Res> {
  const { contentType } = parseBody(PresignRequestSchema, event);
  const ext = contentType.split("/")[1];
  const key = `reports/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: 900 },
  );
  return ok(PresignResponseSchema, { uploadUrl: url, key });
}

/** Corroboration input: other active reports within 150 m of (lat,lng) in the last 30 min. */
async function countNearbyReports(lat: number, lng: number): Promise<number> {
  const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const res = await ddb.send(
    new ScanCommand({
      TableName: Tables.reports,
      FilterExpression: "#ts >= :since",
      ExpressionAttributeNames: { "#ts": "ts" },
      ExpressionAttributeValues: { ":since": since },
    }),
  );
  const items = (res.Items ?? []) as Array<ReportItem & { lat?: number; lng?: number }>;
  return items.filter(
    (r) =>
      r.ttl * 1000 > Date.now() &&
      typeof r.lat === "number" &&
      typeof r.lng === "number" &&
      haversineM({ lat, lng }, { lat: r.lat, lng: r.lng }) <= EVIDENCE_RADIUS_M,
  ).length;
}

async function createReport(event: ReqEvent): Promise<Res> {
  const req = parseBody(CreateReportRequestSchema, event);
  const zone = await resolveZone(req);
  const ts = new Date().toISOString();
  const id = randomUUID();

  // --- fetch + validate the uploaded object (size/type limits enforced again server-side)
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket(), Key: req.imageKey })).catch(() => null);
  if (!head) throw validation("imageKey does not exist — upload the photo first");
  if ((head.ContentLength ?? 0) > MAX_IMAGE_BYTES) throw imageRejected("Image larger than 5 MB");
  const ct = head.ContentType ?? "";
  if (!["image/jpeg", "image/png", "image/webp"].includes(ct)) throw imageRejected("Only jpeg/png/webp allowed");

  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket(), Key: req.imageKey }));
  const bytes = new Uint8Array(await obj.Body!.transformToByteArray());

  // --- vision (P3 module) + trust (P3 module)
  const vision = await analyzeImage(bytes, ct);
  const status = statusFrom(vision, req.type);

  const [nearby, snap, zoneReports] = await Promise.all([
    countNearbyReports(req.lat, req.lng),
    latestSnapshot(zone.zoneId),
    activeReports(zone.zoneId),
  ]);
  const trust = status === "rejected"
    ? 0
    : computeTrust({
        vision,
        nearbyCount: nearby,
        rainNowMmHr: snap?.rainNowMmHr ?? 0,
        ageMs: 0,
      });

  const report: ReportItem = {
    zoneId: zone.zoneId,
    sk: `${ts}#${id}`,
    id,
    ts,
    ttl: Math.floor(Date.now() / 1000) + REPORT_TTL_S,
    type: req.type,
    note: req.note,
    imageKey: req.imageKey,
    lat: req.lat,
    lng: req.lng,
    vision,
    trust,
    status,
  };
  await putReport(report);

  // --- recompute zone risk: live evidence = trust of active non-rejected reports near the zone
  const previousRisk = snap?.risk ?? zone.risk ?? 0;
  const reportTrusts = zoneReports.filter((r) => r.status !== "rejected").map((r) => r.trust);
  if (status !== "rejected") reportTrusts.push(trust);

  const breakdown = computeRisk(
    staticOf(zone),
    { rainNowMmHr: snap?.rainNowMmHr ?? 0, rain24hMm: snap?.rain24hMm ?? 0, reportTrusts },
    snap?.etaMin ?? null,
  );

  const updatedAt = new Date().toISOString();
  await putZoneRisk(zone.zoneId, {
    risk: breakdown.risk,
    tier: breakdown.tier,
    etaMin: breakdown.etaMin,
    updatedAt,
    stale: snap?.stale ?? true,
  });
  await putSnapshot({
    zoneId: zone.zoneId,
    ts: updatedAt,
    ttl: Math.floor(Date.now() / 1000) + 48 * 3600,
    risk: breakdown.risk,
    tier: breakdown.tier,
    etaMin: breakdown.etaMin,
    factors: breakdown.factors,
    contributions: breakdown.contributions,
    underpassMultiplier: breakdown.underpassMultiplier,
    topReasons: breakdown.topReasons,
    rainNowMmHr: snap?.rainNowMmHr ?? 0,
    rain24hMm: snap?.rain24hMm ?? 0,
    forecast: snap?.forecast ?? [],
    stale: snap?.stale ?? true,
  });

  let imageUrl: string | null = null;
  try {
    imageUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket(), Key: req.imageKey }), { expiresIn: 600 });
  } catch { /* image remains reachable by key */ }

  return ok(CreateReportResponseSchema, {
    report: {
      id: report.id,
      zoneId: report.zoneId,
      ts: report.ts,
      type: report.type,
      imageUrl,
      note: report.note ?? null,
      vision: report.vision,
      trust: report.trust,
      status: report.status,
    },
    previousRisk,
    updated: {
      risk: breakdown.risk,
      tier: breakdown.tier,
      etaMin: breakdown.etaMin,
      factors: breakdown.factors,
      contributions: breakdown.contributions,
      underpassMultiplier: breakdown.underpassMultiplier,
      topReasons: breakdown.topReasons,
    },
  });
}

async function listReports(event: ReqEvent): Promise<Res> {
  const zoneId = event.queryStringParameters?.zoneId;
  if (!zoneId) throw validation("zoneId query parameter is required");
  const items = await activeReports(zoneId);
  const reports = await Promise.all(
    items
      .filter((r) => r.status !== "rejected")
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .map(async (r) => ({
        id: r.id,
        zoneId: r.zoneId,
        ts: r.ts,
        type: r.type,
        imageUrl: r.imageKey && process.env.MEDIA_BUCKET
          ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket(), Key: r.imageKey }), { expiresIn: 600 }).catch(() => null)
          : null,
        note: r.note ?? null,
        vision: r.vision,
        trust: r.trust,
        status: r.status,
      })),
  );
  return ok(ReportsListSchema, { reports });
}

export const handler = route(async (event: ReqEvent): Promise<Res> => {
  if (event.routeKey === "POST /reports/presign") return presign(event);
  if (event.routeKey === "POST /reports") return createReport(event);
  return listReports(event); // GET /reports?zoneId=
});
