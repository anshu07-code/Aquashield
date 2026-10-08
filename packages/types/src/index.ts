/**
 * JalRakshak API contract. SINGLE SOURCE OF TRUTH.
 * Rule: change this file only via a small PR announced in the team chat.
 * Frontend, backend, agent and mocks must all validate against these schemas.
 */
import { z } from "zod";

// ---------- primitives ----------
export const TierSchema = z.enum(["SAFE", "WATCH", "HIGH", "CRITICAL"]);
export type Tier = z.infer<typeof TierSchema>;

export const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type LatLng = z.infer<typeof LatLngSchema>;

const Score = z.number().min(0).max(100);

// ---------- risk ----------
export const FactorsSchema = z.object({
  rainNow: Score,
  antecedent24h: Score,
  depression: Score,
  drainageDeficit: Score,
  history: Score,
  liveEvidence: Score,
});
export type Factors = z.infer<typeof FactorsSchema>;

export const ContributionsSchema = z.object({
  rainNow: z.number(),
  antecedent24h: z.number(),
  depression: z.number(),
  drainageDeficit: z.number(),
  history: z.number(),
  liveEvidence: z.number(),
});
export type Contributions = z.infer<typeof ContributionsSchema>;

/** etaMin: 0 = already CRITICAL, null = not within next 3 hours, else minutes. */
export const RiskBreakdownSchema = z.object({
  risk: z.number().int().min(0).max(100),
  tier: TierSchema,
  etaMin: z.number().int().min(0).nullable(),
  factors: FactorsSchema,
  contributions: ContributionsSchema,
  underpassMultiplier: z.number(),
  topReasons: z.array(z.string()).max(5),
});
export type RiskBreakdown = z.infer<typeof RiskBreakdownSchema>;

// ---------- zones ----------
export const ZoneSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  isUnderpass: z.boolean(),
  risk: z.number().int().min(0).max(100),
  tier: TierSchema,
  etaMin: z.number().int().min(0).nullable(),
  updatedAt: z.string(), // ISO 8601
  stale: z.boolean(), // true if forecast cache is older than 45 min
});
export type ZoneSummary = z.infer<typeof ZoneSummarySchema>;
export const ZoneListResponseSchema = z.object({ zones: z.array(ZoneSummarySchema) });

export const ForecastPointSchema = z.object({
  ts: z.string(), // ISO 8601, 15-minute steps
  mmHr: z.number().min(0),
});
export type ForecastPoint = z.infer<typeof ForecastPointSchema>;

// ---------- vision + reports ----------
export const ReportTypeSchema = z.enum(["flooding", "blocked_drain", "overflow", "leak"]);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const VisionAnalysisSchema = z.object({
  isRoadScene: z.boolean(),
  floodedRoad: z.boolean(),
  waterDepthTier: z.enum(["none", "ankle", "knee", "waist", "vehicle_submerged"]),
  blockedDrain: z.boolean(),
  debrisOrWasteObstruction: z.boolean(),
  vehiclesStranded: z.boolean(),
  confidence: z.number().min(0).max(1),
  rejectReason: z.string().nullable(),
  explanation: z.string(),
});
export type VisionAnalysis = z.infer<typeof VisionAnalysisSchema>;

export const ReportStatusSchema = z.enum(["verified", "unverified", "rejected", "needs_review"]);

export const ReportSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  ts: z.string(),
  type: ReportTypeSchema,
  imageUrl: z.string().nullable(), // short-lived presigned GET url
  note: z.string().nullable(),
  vision: VisionAnalysisSchema,
  trust: z.number().min(0).max(1),
  status: ReportStatusSchema,
});
export type Report = z.infer<typeof ReportSchema>;

export const ZoneDetailSchema = z.object({
  zone: ZoneSummarySchema,
  breakdown: RiskBreakdownSchema,
  rain: z.object({ nowMmHr: z.number(), last24hMm: z.number() }),
  forecast: z.array(ForecastPointSchema), // next 3h
  reports: z.array(ReportSchema),
});
export type ZoneDetail = z.infer<typeof ZoneDetailSchema>;

export const PresignRequestSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export const PresignResponseSchema = z.object({ uploadUrl: z.string(), key: z.string() });

export const CreateReportRequestSchema = z.object({
  zoneId: z.string().optional(), // if omitted, backend snaps to nearest zone within 300m
  lat: z.number(),
  lng: z.number(),
  type: ReportTypeSchema,
  imageKey: z.string(),
  note: z.string().max(280).optional(),
});
export const CreateReportResponseSchema = z.object({
  report: ReportSchema,
  previousRisk: z.number().int(),
  updated: RiskBreakdownSchema,
});

// ---------- routing ----------
export const RouteRequestSchema = z.object({
  origin: LatLngSchema,
  destination: LatLngSchema,
});
export const RouteOptionSchema = z.object({
  id: z.string(),
  geometry: z.array(z.tuple([z.number(), z.number()])), // [lng, lat] pairs
  durationMin: z.number(),
  distanceKm: z.number(),
  hazards: z.array(z.object({ zoneId: z.string(), name: z.string(), tier: TierSchema })),
  score: z.number(),
  unsafe: z.boolean(), // crosses a CRITICAL zone
  recommended: z.boolean(),
  summary: z.string(), // e.g. "Avoids 2 flooded underpasses - +6 min"
});
export const RouteResponseSchema = z.object({ routes: z.array(RouteOptionSchema).min(1) });
export type RouteOption = z.infer<typeof RouteOptionSchema>;

// ---------- agent / ops ----------
export const ActionTypeSchema = z.enum([
  "pump_dispatch",
  "drain_cleaning",
  "barricade",
  "traffic_diversion",
  "public_alert",
  "monitor",
]);
export const PrioritySchema = z.enum(["P1", "P2", "P3"]);

export const AgentAskRequestSchema = z.object({
  zoneId: z.string().optional(),
  question: z.string().max(500),
  lang: z.enum(["en", "hi"]).default("en"),
  /** false = plan only. true = agent may create work orders / drafts (UI sets it after a human click). */
  execute: z.boolean().default(false),
});
export const AgentPlanSchema = z.object({
  summary: z.string(),
  why: z.array(z.string()),
  actions: z.array(z.object({ type: ActionTypeSchema, priority: PrioritySchema, reason: z.string() })),
  alertDraft: z.object({ en: z.string(), hi: z.string() }),
  workOrderIds: z.array(z.string()),
  toolsUsed: z.array(z.string()),
  confidenceNote: z.string(),
});
export type AgentPlan = z.infer<typeof AgentPlanSchema>;

export const WorkOrderSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  type: ActionTypeSchema,
  priority: PrioritySchema,
  status: z.enum(["open", "dispatched", "resolved"]),
  note: z.string(),
  createdAt: z.string(),
});
export type WorkOrder = z.infer<typeof WorkOrderSchema>;
export const WorkOrderListResponseSchema = z.object({ workOrders: z.array(WorkOrderSchema) });
export const WorkOrderPatchSchema = z.object({ status: z.enum(["open", "dispatched", "resolved"]) });

export const AlertSchema = z.object({
  id: z.string(),
  zoneId: z.string(),
  lang: z.enum(["en", "hi"]),
  text: z.string(),
  status: z.enum(["draft", "published"]),
  publishedAt: z.string().nullable(),
});

// ---------- errors ----------
export const ErrorResponseSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
