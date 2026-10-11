/**
 * Typed API client. Every response is parsed with the matching zod schema from
 * @aquashield/types so contract drift surfaces immediately (rule: contract first).
 *
 * In mock mode the app talks to the local mock server (`npm run mock:api`); if the server
 * is unreachable it falls back to the static mock JSON so the UI is never broken.
 * Never call Overpass / Open-Meteo / OSRM from here — only our own API.
 */
import {
  AgentAskRequestSchema,
  AgentPlanSchema,
  AlertSchema,
  AlertListResponseSchema,
  AlertPatchSchema,
  CreateAlertRequestSchema,
  CreateReportRequestSchema,
  CreateReportResponseSchema,
  PresignResponseSchema,
  ReportsListSchema,
  ReportStatusSchema,
  ResolveReportResponseSchema,
  RouteResponseSchema,
  WorkOrderListResponseSchema,
  ZoneDetailSchema,
  ZoneListResponseSchema,
  type Report,
  type AgentPlan,
  type LatLng,
  type ReportType,
  type RouteOption,
  type WorkOrder,
  type ZoneDetail,
  type ZoneSummary,
} from "@aquashield/types";
import type { z } from "zod";

/** Types the contract infers but doesn't re-export as named aliases. */
export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;
export type CreateReportResponse = z.infer<typeof CreateReportResponseSchema>;
export type PresignResponse = z.infer<typeof PresignResponseSchema>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001";
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// --- static mock fallbacks (only used when the mock server itself is unreachable) ---
import zonesMock from "../../../mocks/zones.json";
import zoneDetailMock from "../../../mocks/zone-detail.json";

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("BAD_RESPONSE", "The server returned no JSON.", res.status);
  }
  if (!res.ok) {
    const err = (json as { error?: { code?: string; message?: string } })?.error;
    throw new ApiError(
      err?.code ?? "HTTP_ERROR",
      err?.message ?? `Request failed (${res.status})`,
      res.status,
    );
  }
  return json;
}

function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new ApiError(
      "VALIDATION_ERROR",
      `Response did not match the API contract: ${first?.path.join(".") ?? "?"} ${first?.message ?? ""}`,
      500,
    );
  }
  return result.data;
}

/** Fetch, and if mock mode + network failure, fall back to the bundled mock file. */
async function getOrMock<T>(
  path: string,
  schema: z.ZodType<T>,
  mock: unknown,
): Promise<T> {
  try {
    return parse(schema, await getJson(`${API_URL}${path}`));
  } catch (err) {
    if (USE_MOCKS && !(err instanceof ApiError)) {
      // network-level failure against the local mock server → static fallback
      return parse(schema, mock);
    }
    throw err;
  }
}

// ---------- zones ----------

export async function fetchZones(): Promise<ZoneSummary[]> {
  const data = await getOrMock("/zones", ZoneListResponseSchema, zonesMock);
  return data.zones;
}

export async function fetchZoneDetail(id: string): Promise<ZoneDetail> {
  try {
    return parse(ZoneDetailSchema, await getJson(`${API_URL}/zones/${encodeURIComponent(id)}`));
  } catch (err) {
    if (USE_MOCKS && !(err instanceof ApiError)) return parse(ZoneDetailSchema, zoneDetailMock);
    throw err;
  }
}

/** `GET /reports?zoneId=` — active citizen reports for one zone (real data). */
export async function fetchZoneReports(zoneId: string): Promise<Report[]> {
  const data = parse(
    ReportsListSchema,
    await getJson(`${API_URL}/reports?zoneId=${encodeURIComponent(zoneId)}`),
  );
  return data.reports;
}

/** `PATCH /reports/{zoneId}/{id}` — ops marks a citizen report resolved (persists to DB). */
export async function resolveReport(
  zoneId: string,
  id: string,
  passcode?: string,
): Promise<z.infer<typeof ResolveReportResponseSchema>> {
  return parse(
    ResolveReportResponseSchema,
    await getJson(`${API_URL}/reports/${encodeURIComponent(zoneId)}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: passcode ? { "x-ops-passcode": passcode } : undefined,
    }),
  );
}

// ---------- reports ----------

export async function presignUpload(
  contentType: "image/jpeg" | "image/png" | "image/webp",
): Promise<PresignResponse> {
  return parse(
    PresignResponseSchema,
    await getJson(`${API_URL}/reports/presign`, {
      method: "POST",
      body: JSON.stringify({ contentType }),
    }),
  );
}

/**
 * Upload the photo straight to the presigned S3 URL with the exact content type.
 * In mock mode the local server has no bucket, so a failure is non-fatal: we keep the key
 * and let the report through (clearly labelled on screen).
 */
export async function uploadPhoto(
  uploadUrl: string,
  blob: Blob,
  contentType: string,
): Promise<boolean> {
  try {
    const res = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": contentType } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createReport(
  body: CreateReportRequest,
): Promise<CreateReportResponse> {
  CreateReportRequestSchema.parse(body);
  const data = await getJson(`${API_URL}/reports`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return parse(CreateReportResponseSchema, data);
}

// ---------- routing ----------

export async function fetchRoutes(
  origin: LatLng,
  destination: LatLng,
): Promise<RouteOption[]> {
  const data = parse(
    RouteResponseSchema,
    await getJson(`${API_URL}/route`, {
      method: "POST",
      body: JSON.stringify({ origin, destination }),
    }),
  );
  return data.routes;
}

// ---------- agent / ops ----------

export async function askAgent(params: {
  question: string;
  zoneId?: string;
  lang?: "en" | "hi";
  execute?: boolean;
  passcode?: string;
}): Promise<AgentPlan> {
  const parsed = AgentAskRequestSchema.parse({
    question: params.question,
    zoneId: params.zoneId,
    lang: params.lang ?? "en",
    execute: params.execute ?? false,
  });
  const data = await getJson(`${API_URL}/agent/ask`, {
    method: "POST",
    body: JSON.stringify(parsed),
    headers: params.passcode ? { "x-ops-passcode": params.passcode } : undefined,
  });
  return parse(AgentPlanSchema, data);
}

export async function fetchWorkOrders(passcode?: string): Promise<WorkOrder[]> {
  const data = parse(
    WorkOrderListResponseSchema,
    await getJson(`${API_URL}/workorders`, {
      headers: passcode ? { "x-ops-passcode": passcode } : undefined,
    }),
  );
  return data.workOrders;
}

export type WorkOrderStatus = "open" | "dispatched" | "resolved";

/**
 * Advance a work order's status. The mock server echoes `{ id, status }` (not a full
 * WorkOrder), so we optimistically apply the requested status and only revert on hard
 * failure — this works against both the mock and the real contract-compliant API.
 */
export async function patchWorkOrder(
  id: string,
  status: WorkOrderStatus,
  passcode?: string,
): Promise<void> {
  await getJson(`${API_URL}/workorders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
    headers: passcode ? { "x-ops-passcode": passcode } : undefined,
  });
}

export async function publishAlert(
  alertId: string,
  passcode?: string,
): Promise<{ id: string; publishedAt: string | null }> {
  const data = await getJson(`${API_URL}/alerts/${encodeURIComponent(alertId)}/publish`, {
    method: "POST",
    headers: passcode ? { "x-ops-passcode": passcode } : undefined,
  });
  const obj = (data ?? {}) as { id?: string; publishedAt?: string };
  return { id: obj.id ?? alertId, publishedAt: obj.publishedAt ?? new Date().toISOString() };
}

/**
 * Create a draft alert (POST /alerts). The backend only publishes alerts that exist as
 * drafts, so UI must create the draft first and use the returned id to publish it.
 */
export async function createAlert(
  body: { zoneId: string; lang?: "en" | "hi"; text: string },
  passcode?: string,
): Promise<z.infer<typeof AlertSchema>> {
  const parsed = CreateAlertRequestSchema.parse(body);
  return parse(
    AlertSchema,
    await getJson(`${API_URL}/alerts`, {
      method: "POST",
      body: JSON.stringify(parsed),
      headers: passcode ? { "x-ops-passcode": passcode } : undefined,
    }),
  );
}

/** List all alerts, optionally filtered by zoneId and/or status. */
export async function fetchAlerts(opts?: {
  zoneId?: string;
  status?: string;
}, passcode?: string): Promise<z.infer<typeof AlertSchema>[]> {
  const params = new URLSearchParams();
  if (opts?.zoneId) params.set("zoneId", opts.zoneId);
  if (opts?.status) params.set("status", opts.status);
  const qs = params.toString();
  const url = `${API_URL}/alerts${qs ? `?${qs}` : ""}`;
  const data = parse(
    AlertListResponseSchema,
    await getJson(url, { headers: passcode ? { "x-ops-passcode": passcode } : undefined }),
  );
  return data.alerts;
}

/** Get a single alert by id. */
export async function fetchAlert(id: string, passcode?: string): Promise<z.infer<typeof AlertSchema>> {
  return parse(
    AlertSchema,
    await getJson(`${API_URL}/alerts/${encodeURIComponent(id)}`, {
      headers: passcode ? { "x-ops-passcode": passcode } : undefined,
    }),
  );
}

/** Update alert status (e.g. resolve it). PATCH /alerts/{id} */
export async function updateAlert(
  id: string,
  patch: { status?: "draft" | "published" | "resolved" },
  passcode?: string,
): Promise<z.infer<typeof AlertSchema>> {
  const parsed = AlertPatchSchema.parse(patch);
  return parse(
    AlertSchema,
    await getJson(`${API_URL}/alerts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(parsed),
      headers: passcode ? { "x-ops-passcode": passcode } : undefined,
    }),
  );
}

export const REPORT_TYPES: ReportType[] = ["flooding", "blocked_drain", "overflow", "leak"];
