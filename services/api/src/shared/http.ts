/**
 * Shared HTTP helpers for all Aquashield API Lambdas (API Gateway HTTP API v2).
 * Contract: every response is validated against @aquashield/types before it leaves
 * the Lambda. Errors are always `{ error: { code, message } }` (docs/CONTRACT.md).
 */
import type { ZodType } from "zod";
import { ErrorResponseSchema } from "@aquashield/types";

export interface ReqEvent {
  rawPath: string;
  pathParameters?: Record<string, string> | null;
  queryStringParameters?: Record<string, string> | null;
  headers?: Record<string, string> | null;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext: { http: { method: string; path: string } };
}

export interface Res {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type,x-ops-passcode",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

/** Error with a contract error code (VALIDATION_ERROR, NOT_FOUND, ...). */
export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export const notFound = (what: string) => new ApiError("NOT_FOUND", `${what} not found`, 404);
export const validation = (msg: string) => new ApiError("VALIDATION_ERROR", msg, 400);
export const noZoneNearby = () => new ApiError("NO_ZONE_NEARBY", "No zone within 300 m of that location", 422);
export const imageRejected = (msg: string) => new ApiError("IMAGE_REJECTED", msg, 422);
export const unauthorized = (msg = "Missing or invalid x-ops-passcode") => new ApiError("UNAUTHORIZED", msg, 401);

/** Respond with a schema-validated body — fails loudly on contract drift. */
export function ok<T>(schema: ZodType<T>, body: unknown, status = 200): Res {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Contract drift: log and return INTERNAL rather than a wrong-shaped 200.
    console.error(JSON.stringify({ level: "CONTRACT_DRIFT", issues: parsed.error.issues }));
    return fail("INTERNAL", "Response failed contract validation", 500);
  }
  return { statusCode: status, headers: CORS, body: JSON.stringify(parsed.data) };
}

/** Plain JSON response (only for /health, which has no zod schema). */
export function raw(body: unknown, status = 200): Res {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

export function fail(code: string, message: string, status: number): Res {
  const parsed = ErrorResponseSchema.safeParse({ error: { code, message } });
  return { statusCode: status, headers: CORS, body: JSON.stringify(parsed.success ? parsed.data : { error: { code, message } } ) };
}

/** Parse and validate the request body. Throws ApiError on bad JSON/schema. */
export function parseBody<T>(schema: ZodType<T>, event: ReqEvent): T {
  if (!event.body) throw validation("Request body is required");
  const text = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw validation("Body is not valid JSON");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ");
    throw validation(issues);
  }
  return parsed.data;
}

/** Ops endpoints require the x-ops-passcode header matching OPS_PASSCODE. */
export function assertOps(event: ReqEvent): void {
  const provided = event.headers?.["x-ops-passcode"] ?? event.headers?.["X-Ops-Passcode"];
  const expected = process.env.OPS_PASSCODE;
  if (!expected || !provided || provided !== expected) throw unauthorized();
}

/** Wrap a handler with uniform error handling + logging. */
export function route(fn: (event: ReqEvent) => Promise<Res> | Res) {
  return async (event: ReqEvent): Promise<Res> => {
    const method = event.requestContext?.http?.method ?? "?";
    const path = event.rawPath;
    const t0 = Date.now();
    try {
      if (method === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
      const res = await fn(event);
      console.log(JSON.stringify({ method, path, status: res.statusCode, ms: Date.now() - t0 }));
      return res;
    } catch (e) {
      if (e instanceof ApiError) {
        console.log(JSON.stringify({ method, path, status: e.status, code: e.code, ms: Date.now() - t0 }));
        return fail(e.code, e.message, e.status);
      }
      console.error(JSON.stringify({ level: "ERROR", method, path, err: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.split("\n").slice(0, 4) : undefined }));
      return fail("INTERNAL", "Unexpected server error", 500);
    }
  };
}
