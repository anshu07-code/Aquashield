/**
 * DynamoDB access layer (document client). Table names come from Lambda env vars
 * set by infra/template.yaml — never hard-code table names.
 *
 * Item shapes (see docs/CONTRACT.md):
 *  Zones        pk zoneId            + static attrs + denormalised latest risk
 *  RiskSnapshots pk zoneId, sk ts     full RiskBreakdown + forecast + rain, ttl 48h
 *  Reports      pk zoneId, sk ts#id   report + vision + trust, ttl 6h
 *  WorkOrders   pk id
 *  Alerts       pk id
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { RiskBreakdown, VisionAnalysis, Tier } from "@aquashield/types";

const raw = new DynamoDBClient({});
export const ddb = DynamoDBDocumentClient.from(raw, {
  marshallOptions: { removeUndefinedValues: true },
});

const env = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var ${key}`);
  return v;
};

export const Tables = {
  get zones() { return env("TABLE_ZONES"); },
  get snapshots() { return env("TABLE_SNAPSHOTS"); },
  get reports() { return env("TABLE_REPORTS"); },
  get workorders() { return env("TABLE_WORKORDERS"); },
  get alerts() { return env("TABLE_ALERTS"); },
};

/** Static + live fields for a zone as stored in the Zones table. */
export interface ZoneItem {
  zoneId: string;
  name: string;
  lat: number;
  lng: number;
  isUnderpass: boolean;
  // static attributes (from data/zones.geojson via scripts/seed.ts)
  depressionDepthM: number;
  drainageDeficit: number;
  historyScore: number;
  criticalRainMmHr: number;
  // denormalised latest risk (written by ingest + report recompute)
  risk?: number;
  tier?: Tier;
  etaMin?: number | null;
  updatedAt?: string;
  stale?: boolean;
}

export interface SnapshotItem {
  zoneId: string;
  ts: string;
  ttl: number;
  risk: number;
  tier: Tier;
  etaMin: number | null;
  factors: RiskBreakdown["factors"];
  contributions: RiskBreakdown["contributions"];
  underpassMultiplier: number;
  topReasons: string[];
  rainNowMmHr: number;
  rain24hMm: number;
  forecast: { ts: string; mmHr: number }[];
  stale: boolean;
}

export interface ReportItem {
  zoneId: string;
  sk: string; // `${ts}#${id}`
  id: string;
  ts: string;
  ttl: number;
  type: "flooding" | "blocked_drain" | "overflow" | "leak";
  note?: string;
  imageKey?: string;
  lat?: number;
  lng?: number;
  vision: VisionAnalysis;
  trust: number;
  status: "verified" | "unverified" | "rejected" | "needs_review";
}

export interface WorkOrderItem {
  id: string;
  zoneId: string;
  type: string;
  priority: "P1" | "P2" | "P3";
  status: "open" | "dispatched" | "resolved";
  note: string;
  createdAt: string;
}

export interface AlertItem {
  id: string;
  zoneId: string;
  lang: "en" | "hi";
  text: string;
  status: "draft" | "published" | "resolved";
  publishedAt: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export async function getZone(zoneId: string): Promise<ZoneItem | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: Tables.zones, Key: { zoneId } }));
  return res.Item as ZoneItem | undefined;
}

export async function scanZones(): Promise<ZoneItem[]> {
  const items: ZoneItem[] = [];
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const res = await ddb.send(new ScanCommand({ TableName: Tables.zones, ExclusiveStartKey }));
    items.push(...((res.Items ?? []) as ZoneItem[]));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Latest risk snapshot for a zone (newest ts). */
export async function latestSnapshot(zoneId: string): Promise<SnapshotItem | undefined> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: Tables.snapshots,
      KeyConditionExpression: "zoneId = :z",
      ExpressionAttributeValues: { ":z": zoneId },
      ScanIndexForward: false,
      Limit: 1,
    }),
  );
  return res.Items?.[0] as SnapshotItem | undefined;
}

/** Active reports for a zone (DynamoDB TTL drops expired ones; belt-and-braces filter). */
export async function activeReports(zoneId: string, nowMs = Date.now()): Promise<ReportItem[]> {
  const res = await ddb.send(
    new QueryCommand({
      TableName: Tables.reports,
      KeyConditionExpression: "zoneId = :z",
      ExpressionAttributeValues: { ":z": zoneId },
    }),
  );
  const items = (res.Items ?? []) as ReportItem[];
  return items.filter((r) => (r.ttl ?? 0) * 1000 > nowMs);
}

export async function putSnapshot(item: SnapshotItem): Promise<void> {
  await ddb.send(new PutCommand({ TableName: Tables.snapshots, Item: item }));
}

export async function putReport(item: ReportItem): Promise<void> {
  await ddb.send(new PutCommand({ TableName: Tables.reports, Item: item }));
}

export async function putZoneRisk(
  zoneId: string,
  latest: { risk: number; tier: Tier; etaMin: number | null; updatedAt: string; stale: boolean },
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: Tables.zones,
      Key: { zoneId },
      UpdateExpression: "SET #r = :r, tier = :t, etaMin = :e, updatedAt = :u, stale = :s",
      ExpressionAttributeNames: { "#r": "risk" },
      ExpressionAttributeValues: { ":r": latest.risk, ":t": latest.tier, ":e": latest.etaMin, ":u": latest.updatedAt, ":s": latest.stale },
    }),
  );
}

export async function putWorkOrder(item: WorkOrderItem): Promise<void> {
  await ddb.send(new PutCommand({ TableName: Tables.workorders, Item: item }));
}

export async function putAlert(item: AlertItem): Promise<void> {
  await ddb.send(new PutCommand({ TableName: Tables.alerts, Item: item }));
}

/** Normalize a raw alert item so legacy rows (missing createdAt) match the current AlertSchema contract. */
export function normalizeAlert(item: AlertItem): AlertItem {
  return {
    ...item,
    createdAt: item.createdAt ?? item.publishedAt ?? new Date().toISOString(),
    resolvedAt: item.resolvedAt ?? null,
  };
}

export async function getAlert(id: string): Promise<AlertItem | undefined> {
  const res = await ddb.send(new GetCommand({ TableName: Tables.alerts, Key: { id } }));
  const item = res.Item as AlertItem | undefined;
  return item ? normalizeAlert(item) : undefined;
}

/** Scan alerts with optional zoneId and status filters (fine for small tables / MVP). */
export async function scanAlerts(opts?: {
  zoneId?: string;
  status?: string;
}): Promise<AlertItem[]> {
  let ExclusiveStartKey: Record<string, unknown> | undefined;
  const all: AlertItem[] = [];
  do {
    const res = await ddb.send(
      new ScanCommand({ TableName: Tables.alerts, ExclusiveStartKey }),
    );
    const items = (res.Items ?? []) as AlertItem[];
    const filtered = opts?.zoneId || opts?.status
      ? items.filter((a) =>
          (!opts.zoneId || a.zoneId === opts.zoneId) &&
          (!opts.status || a.status === opts.status)
        )
      : items;
    all.push(...filtered.map(normalizeAlert));
    ExclusiveStartKey = res.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first
}
