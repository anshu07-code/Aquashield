/**
 * POST /agent/ask — Ask Aquashield action plan (Amazon Bedrock-powered).
 *
 * Contract: AgentAskRequest -> AgentPlan (packages/types). execute=false returns a plan only;
 * execute=true (set by a human click in the UI) lets the plan create work orders.
 * Ops passcode required when execute=true.
 *
 * Rules (AGENTS.md):
 *  - The model NEVER invents numbers: it only reasons from the data context handed to it
 *    (zones, forecast snapshot, citizen reports) and must say so when a number is not known.
 *  - Output is forced to valid JSON and validated/coerced against AgentPlanSchema; if the
 *    model output is unusable we fall back to a deterministic data-grounded plan.
 *  - Flood questions get a concrete action plan; general questions get an intelligent
 *    answer with empty actions/alertDraft.
 */
import { randomUUID } from "node:crypto";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import {
  AgentAskRequestSchema,
  AgentPlanSchema,
  ActionTypeSchema,
  PrioritySchema,
  type AgentPlan,
} from "@aquashield/types";
import { route, ok, parseBody, assertOps, notFound, type ReqEvent, type Res } from "../shared/http.ts";
import { scanZones, activeReports, latestSnapshot, putWorkOrder, type ZoneItem, type SnapshotItem } from "../shared/db.ts";
import type { z } from "zod";

type ActionType = z.infer<typeof ActionTypeSchema>;
type Priority = z.infer<typeof PrioritySchema>;
type AgentAction = { type: ActionType; priority: Priority; reason: string };

const ACTION_TYPES: ActionType[] = ["pump_dispatch", "drain_cleaning", "barricade", "traffic_diversion", "public_alert", "monitor"];
const PRIORITIES: Priority[] = ["P1", "P2", "P3"];

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "amazon.nova-lite-v1:0";
const REGION = process.env.AWS_REGION ?? "ap-southeast-2";

const bedrock = new BedrockRuntimeClient({ region: REGION, maxAttempts: 3, retryMode: "adaptive" });

// ---------- deterministic fallback (used if Bedrock is unavailable or output is invalid) ----------
const ACTION_FOR_TIER: Record<string, { type: ActionType; priority: Priority }> = {
  CRITICAL: { type: "pump_dispatch", priority: "P1" },
  HIGH: { type: "drain_cleaning", priority: "P2" },
  WATCH: { type: "monitor", priority: "P3" },
  SAFE: { type: "monitor", priority: "P3" },
};

function pickZone(zones: ZoneItem[], zoneId?: string): ZoneItem {
  if (zoneId) {
    const z = zones.find((x) => x.zoneId === zoneId);
    if (z) return z;
    throw notFound("Zone");
  }
  const sorted = [...zones].sort((a, b) => (b.risk ?? 0) - (a.risk ?? 0));
  if (!sorted.length) throw notFound("Zone");
  return sorted[0];
}

function alertTexts(z: ZoneItem, snap: SnapshotItem | undefined): { en: string; hi: string } {
  const risk = snap?.risk ?? z.risk ?? 0;
  const tier = snap?.tier ?? z.tier ?? "SAFE";
  const en =
    tier === "CRITICAL" || tier === "HIGH"
      ? `AVOID ${z.name}: flood risk ${risk}/100 (${tier}). Use an alternate route. - Aquashield`
      : `Update: ${z.name} flood risk ${risk}/100 (${tier}). Drive carefully. - Aquashield`;
  const hi =
    tier === "CRITICAL" || tier === "HIGH"
      ? `${z.name} पर बाढ़ का खतरा ${risk}/100 (${tier}) — दूसरा रास्ता लें। - आक्वाशील्ड`
      : `सूचना: ${z.name} पर बाढ़ का खतरा ${risk}/100 (${tier}) — सावधानी से चलें। - आक्वाशील्ड`;
  return { en: en.slice(0, 160), hi: hi.slice(0, 160) };
}

function fallbackPlan(
  z: ZoneItem,
  snap: SnapshotItem | undefined,
  reports: Awaited<ReturnType<typeof activeReports>>,
  question: string,
): AgentPlan {
  const risk = snap?.risk ?? z.risk ?? 0;
  const tier = snap?.tier ?? z.tier ?? "SAFE";
  const verifiedCount = reports.filter((r) => r.status === "verified").length;
  const activeCount = reports.filter((r) => r.status !== "rejected" && r.status !== "resolved").length;

  const action = ACTION_FOR_TIER[tier] ?? ACTION_FOR_TIER.WATCH;
  const low = tier === "CRITICAL" || tier === "HIGH";
  const why: string[] = [];
  if (snap?.topReasons?.length) why.push(...snap.topReasons);
  if (!why.length) why.push("No forecast snapshot yet — baseline risk from static zone attributes");
  if (activeCount) why.push(`${activeCount} active citizen report${activeCount === 1 ? "" : "s"} (${verifiedCount} verified)`);
  const eta = snap?.etaMin;
  if (eta === 0) why.push("Zone is already CRITICAL");
  else if (eta !== undefined && eta !== null) why.push(`ETA to CRITICAL: ~${eta} min`);

  return {
    summary: low
      ? `${z.name} (${z.zoneId}) is ${tier} at risk ${risk}/100 — ${action.type.replace("_", " ")} recommended now. ${question}`
      : `${z.name} (${z.zoneId}) is ${tier} at risk ${risk}/100 — monitoring. ${question}`,
    why: why.slice(0, 4),
    actions: [{ type: action.type, priority: action.priority, reason: `Tier ${tier} at ${z.name} (risk ${risk})` }],
    alertDraft: alertTexts(z, snap),
    workOrderIds: [],
    toolsUsed: ["get_zone_risk", "get_nearby_reports"],
    confidenceNote: `Based on ${snap ? `forecast at ${snap.ts}` : "static zone attributes"} and ${activeCount} active report(s). Deterministic fallback — Bedrock unavailable/invalid output.`,
  };
}

// ---------- Bedrock call ----------
function stripCodeFence(text: string): string {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function extractJson(text: string): string {
  const clean = stripCodeFence(text);
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model output");
  return clean.slice(start, end + 1);
}

/** Coerce model output to a valid AgentPlan (drop invalid actions, coerce enums, cap lengths). */
function coercePlan(raw: unknown, fallback: AgentPlan): AgentPlan {
  if (!raw || typeof raw !== "object") throw new Error("plan not an object");
  const r = raw as Record<string, unknown>;
  const actions: AgentAction[] = Array.isArray(r.actions)
    ? r.actions
        .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
        .map((a) => ({
          type: (ACTION_TYPES as string[]).includes(String(a.type ?? "")) ? (a.type as ActionType) : undefined,
          priority: (PRIORITIES as string[]).includes(String(a.priority ?? "")) ? (a.priority as Priority) : undefined,
          reason: typeof a.reason === "string" ? a.reason.slice(0, 280) : "",
        }))
        .filter((a): a is AgentAction => !!a.type && !!a.priority)
        .slice(0, 5)
    : [];

  const str = (k: string, max: number) => (typeof r[k] === "string" ? (r[k] as string).slice(0, max) : "");
  const why = Array.isArray(r.why) ? r.why.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
  const drafts = r.alertDraft && typeof r.alertDraft === "object" ? (r.alertDraft as Record<string, unknown>) : {};
  const en = typeof drafts.en === "string" ? drafts.en : typeof drafts.EN === "string" ? drafts.EN : "";
  const hi = typeof drafts.hi === "string" ? drafts.hi : typeof drafts.HI === "string" ? drafts.HI : "";
  const alertDraft = { en: en.slice(0, 160), hi: hi.slice(0, 160) };

  return {
    summary: str("summary", 1000) || fallback.summary,
    why: why.length ? why : fallback.why,
    actions: actions.length ? actions : fallback.actions,
    alertDraft: alertDraft.en || alertDraft.hi ? alertDraft : fallback.alertDraft,
    workOrderIds: [],
    toolsUsed: fallback.toolsUsed,
    confidenceNote: str("confidenceNote", 400) || fallback.confidenceNote,
  };
}

async function askBedrock(question: string, lang: string, context: Record<string, unknown>): Promise<string> {
  const system = `You are Aquashield — a hyperlocal urban flood early-warning AI for Delhi city operations.
You help flood-control operators plan actions (work orders + public alerts) and answer their questions.

STRICT RULES:
1. FACTS ONLY: Use ONLY the numbers and facts in the <context> JSON. Never invent measurements,
   readings, or statistics. If a fact isn't in the context, say you don't have that live data.
2. ANSWER THE ACTUAL QUESTION. The user's question may not be flood-related ("what is mango?").
   Then just answer it helpfully and clearly, and set actions and alertDraft to empty strings/arrays.
3. FLOOD QUESTIONS: produce a concrete, prioritized action plan using the allowed action types and
   priorities below, grounded in the zone/risk/report data. Recommend a public alert only when the
   selected zone or the worst zone is HIGH or CRITICAL.
4. Welcome a human operator tone. Respond in the user's language: ${lang === "hi" ? "Hindi" : "English"}.

Allowed action types: pump_dispatch, drain_cleaning, barricade, traffic_diversion, public_alert, monitor.
Allowed priorities: P1 (urgent, CRITICAL), P2 (soon, HIGH/WATCH), P3 (routine).

Respond with JSON ONLY (no markdown, no commentary) matching exactly this shape:
{
  "summary": "2-4 sentence answer to the question, grounded in the data",
  "why": ["bullet reason 1", "bullet reason 2"],
  "actions": [{"type": "...", "priority": "P1|P2|P3", "reason": "short justification"}],
  "alertDraft": {"en": "short public alert in English or empty string", "hi": "short public alert in Hindi or empty string"},
  "confidenceNote": "one sentence noting what live data you used, or that it wasn't flood-related"
}`;
  const user = `<context>${JSON.stringify(context)}</context>\n\nUSER QUESTION: ${question}`;

  const res = await bedrock.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      system: [{ text: system }],
      messages: [{ role: "user", content: [{ text: user }] }],
      inferenceConfig: { maxTokens: 700, temperature: 0.3 },
    }),
  );
  const content = res.output?.message?.content ?? [];
  const text = content.map((b) => b.text ?? "").join("");
  if (!text) throw new Error("empty bedrock output");
  return text;
}

// ---------- handler ----------
export const handler = route(async (event: ReqEvent): Promise<Res> => {
  const req = parseBody(AgentAskRequestSchema, event);
  if (req.execute) assertOps(event); // human confirmed: creating real work orders

  const zones = await scanZones();
  const snaps = await Promise.all(zones.map((x) => latestSnapshot(x.zoneId)));
  const z = pickZone(zones, req.zoneId);
  const snap = snaps.find((s) => s?.zoneId === z.zoneId);
  const reports = await activeReports(z.zoneId);
  const fallback = fallbackPlan(z, snap, reports, req.question);

  let plan: AgentPlan;
  try {
    const raw = await askBedrock(req.question, req.lang ?? "en", dataContext(zones, z, snap, reports));
    plan = coercePlan(JSON.parse(extractJson(raw)), fallback);
  } catch {
    // deterministic fallback keeps the ops UI working when Bedrock is throttled/errors
    plan = fallback;
  }

  if (req.execute && plan.actions.length > 0) {
    // Persist up to the first 2 actions as real work orders (human clicked "Execute").
    const ids: string[] = [];
    for (const a of plan.actions.slice(0, 2)) {
      const id = `wo_${randomUUID().slice(0, 8)}`;
      await putWorkOrder({
        id,
        zoneId: z.zoneId,
        type: a.type,
        priority: a.priority,
        status: "open",
        note: `${plan.summary} → ${a.reason}`.slice(0, 280),
        createdAt: new Date().toISOString(),
      });
      ids.push(id);
    }
    plan.workOrderIds = ids;
    plan.toolsUsed = [...plan.toolsUsed, "create_work_order"];
  }

  return ok(AgentPlanSchema, plan);
});

function dataContext(
  zones: ZoneItem[],
  z: ZoneItem,
  snap: SnapshotItem | undefined,
  reports: Awaited<ReturnType<typeof activeReports>>,
): Record<string, unknown> {
  const active = reports.filter((r) => r.status !== "rejected" && r.status !== "resolved");
  return {
    selectedZone: {
      id: z.zoneId,
      name: z.name,
      tier: snap?.tier ?? z.tier ?? "SAFE",
      risk: snap?.risk ?? z.risk ?? 0,
      etaMin: snap?.etaMin ?? z.etaMin ?? null,
      underpass: !!z.isUnderpass,
      stale: !!z.stale,
      topReasons: snap?.topReasons ?? [],
    },
    allZones: zones.map((x) => ({
      id: x.zoneId,
      name: x.name,
      tier: x.tier,
      risk: x.risk ?? 0,
      etaMin: x.etaMin ?? null,
      underpass: !!x.isUnderpass,
    })),
    forecastSnapshot: snap
      ? { takenAt: snap.ts, tier: snap.tier, risk: snap.risk, etaMin: snap.etaMin, topReasons: snap.topReasons ?? [] }
      : null,
    citizenReports: active.slice(0, 10).map((r) => ({
      id: r.id,
      status: r.status,
      waterDepth: r.vision?.waterDepthTier ?? null,
      trust: r.trust,
      time: r.ts,
    })),
  };
}
