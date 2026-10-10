/**
 * POST /agent/ask — Ask Aquashield action plan.
 *
 * Contract: AgentAskRequest -> AgentPlan (packages/types). execute=false returns a plan only;
 * execute=true (set by a human click in the UI) lets the plan create work orders.
 * Ops passcode required when execute=true.
 *
 * Question-aware placeholder (not an LLM): it reads the question, detects whether it is
 * on-topic (flood/weather/zone) and which intent it matches (risk / forecast / reports /
 * route / alert / nearby / action), and returns a DATA-GROUNDED answer tailored to that.
 * Off-topic questions ("what is a mango", "tell me a joke") get a polite redirect instead of
 * a canned plan. Facts always come from zone/snapshot/report data — never invented.
 */
import { randomUUID } from "node:crypto";
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

const ACTION_FOR_TIER: Record<string, { type: ActionType; priority: Priority }> = {
  CRITICAL: { type: "pump_dispatch", priority: "P1" },
  HIGH: { type: "drain_cleaning", priority: "P2" },
  WATCH: { type: "monitor", priority: "P3" },
  SAFE: { type: "monitor", priority: "P3" },
};

/** Detected intent of the user's question, or "offtopic" when it has nothing to do with floods. */
type AgentIntent = "risk" | "forecast" | "reports" | "route" | "alert" | "nearby" | "action" | "offtopic";

const TOPIC_HINTS =
  /flood|water|drain|underpass|rain|weather|forecast|risk|danger|critical|road|route|zone|delhi|overpass|report|alert|citizen|safety|traffic|submerged/i;

const OFFTOPIC_HINTS =
  /\bmango|apple|banana|orange|fruit|vegetable|recipe|food|cook|movie|film|song|music|game|sport|cricket|football|stock|share|price|job|salary|school|exam|medicine|doctor|joke|jokes|story|who are you|what are you|how are you|hello|hi |hey|thanks|thank you|bye|greetings|meaning of the word|dictionary/i;

function classifyIntent(question: string): AgentIntent {
  const q = question.trim().toLowerCase();
  if (!q) return "risk";

  // Clear cut-out: questions that are obviously NOT about the flood system.
  if (OFFTOPIC_HINTS.test(q) && !TOPIC_HINTS.test(q)) return "offtopic";

  // A question with zero flood-domain vocabulary is almost certainly irrelevant.
  if (!TOPIC_HINTS.test(q)) return "offtopic";

  if (/saf(?:e|er|ety)|route|alternative|avoid|detour|bypass|navig/i.test(q)) return "route";
  if (/forecast|rain|rainfall|precip|mm\b|next \d+ hour/i.test(q)) return "forecast";
  if (/report|citizen|photo|evidence|verified|claim/i.test(q)) return "reports";
  if (/alert|warn|notify|message|advisory/i.test(q)) return "alert";
  if (/nearby|neighbour|neighbor|around|adjacent|near\b|compare|all zones/i.test(q)) return "nearby";
  if (/action|should we|do (we|i)|what to do|deploy|work order|plan|recommend|priority/i.test(q)) return "action";
  return "risk";
}

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

interface ZoneContext {
  z: ZoneItem;
  snap: SnapshotItem | undefined;
  reports: { verifiedCount: number; activeCount: number };
  nearby: ZoneItem[];
}

/** Build a data-grounded plan for each detected intent. */
function planForIntent(intent: AgentIntent, ctx: ZoneContext, question: string, lang: string): AgentPlan {
  const { z, snap, reports, nearby } = ctx;
  const risk = snap?.risk ?? z.risk ?? 0;
  const tier = snap?.tier ?? z.tier ?? "SAFE";

  // ---- Off-topic: politely redirect instead of a canned flood plan ----
  if (intent === "offtopic") {
    return {
      summary: `I'm Aquashield, an assistant for Delhi flood risk — I can't answer that. Ask me about the selected zone instead (e.g. risk now, rain forecast, citizen reports, or safe routes).`,
      why: [
        `Your question (${question.slice(0, 60)}…) is not about Delhi's flood-monitored zones.`,
        "I only answer flood / weather / routing questions using live zone data.",
        "Pick or mention a zone (e.g. Minto Bridge) and ask about its risk, forecast or reports.",
      ],
      actions: [],
      alertDraft: {
        en: "This question is outside the flood-monitoring scope. Ask about a monitored zone instead.",
        hi: "यह प्रश्न बाढ़-निगरानी के दायरे से बाहर है। कृपया किसी मॉनिटर किए जा रहे ज़ोन के बारे में पूछें।",
      },
      workOrderIds: [],
      toolsUsed: [],
      confidenceNote: "No tools used — question was off-topic.",
    };
  }

  const action = ACTION_FOR_TIER[tier] ?? ACTION_FOR_TIER.WATCH;
  const why: string[] = [];
  if (snap?.topReasons?.length) why.push(...snap.topReasons);
  if (!why.length) why.push("No forecast snapshot yet — baseline risk from static zone attributes");
  if (reports.activeCount) why.push(`${reports.activeCount} active citizen report${reports.activeCount === 1 ? "" : "s"} (${reports.verifiedCount} verified)`);
  const eta = snap?.etaMin;
  if (eta === 0) why.push("Zone is already CRITICAL");
  else if (eta !== undefined && eta !== null) why.push(`ETA to CRITICAL: ~${eta} min`);

  const actions = [
    { type: action.type, priority: action.priority, reason: `Tier ${tier} at ${z.name} (risk ${risk})` },
  ];

  switch (intent) {
    case "forecast": {
      const forecast = snap?.forecast ?? [];
      const peak = forecast.reduce<string | null>((m, f) => (m === null || f.mmHr > (forecast.find((x) => x.ts === m)?.mmHr ?? 0) ? f.ts : m), null);
      if (forecast.length) {
        why.push(`Rain forecast: up to ${Math.max(...forecast.map((f) => f.mmHr))} mm/hr in the next ${forecast.length} step(s)`);
      }
      return {
        summary: `Rain outlook for ${z.name} (${tier}, risk ${risk}/100)${forecast.length ? ` — peak ${Math.max(...forecast.map((f) => f.mmHr))} mm/hr ${peak ? "ahead" : ""}` : " — no 3-hour forecast snapshot yet"}.`,
        why,
        actions,
        alertDraft: alertTexts(z, snap),
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "get_forecast"],
        confidenceNote: `Forecast snapshot ${snap ? `at ${snap.ts}` : "unavailable"}. ${reports.activeCount} active report(s).`,
      };
    }
    case "reports": {
      return {
        summary: `${z.name}: ${reports.activeCount} active citizen report${reports.activeCount === 1 ? "" : "s"}, ${reports.verifiedCount} verified by AI vision.`,
        why,
        actions,
        alertDraft: alertTexts(z, snap),
        workOrderIds: [],
        toolsUsed: ["get_nearby_reports", "get_zone_risk"],
        confidenceNote: "Counts are live from the reports table; photos are AI-verified by Bedrock vision.",
      };
    }
    case "alert": {
      return {
        summary: `Public alert drafted for ${z.name} (${tier}, risk ${risk}/100).`,
        why,
        actions: [actions[0], { type: "public_alert", priority: tier === "CRITICAL" || tier === "HIGH" ? "P1" : "P2", reason: "Publish the bilingual alert below for the public." }],
        alertDraft: alertTexts(z, snap),
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "draft_alert"],
        confidenceNote: `Alert is a DRAFT — publish it from the ops UI (needs a human confirmation).`,
      };
    }
    case "nearby": {
      return {
        summary: `${z.name} is ${tier} (risk ${risk}/100). Nearby zones: ${nearby.length ? nearby.slice(0, 4).map((n) => `${n.zoneId} (${n.tier ?? "SAFE"})`).join(", ") : "none within ~1 km"}.`,
        why,
        actions,
        alertDraft: alertTexts(z, snap),
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "get_nearby_zones"],
        confidenceNote: "Nearby list uses zone co-ordinates (haversine ≤ 1 km).",
      };
    }
    case "route": {
      return {
        summary: `Safe routing near ${z.name} (${tier}, risk ${risk}/100): prefer roads that avoid this underpass.`,
        why,
        actions: [actions[0], { type: "traffic_diversion", priority: tier === "CRITICAL" ? "P1" : "P2", reason: `Divert traffic away from ${z.name} while risk is ${tier}.` }],
        alertDraft: alertTexts(z, snap),
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "plan_safe_route"],
        confidenceNote: "Route suggestion is high-level; the citizen app computes turn-by-turn alternatives.",
      };
    }
    case "action":
    default: {
      return {
        summary: `${z.name} is ${tier} (${risk}/100). Recommended action: ${action.type.replace(/_/g, " ")} (${action.priority}).`,
        why,
        actions,
        alertDraft: alertTexts(z, snap),
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "get_nearby_reports"],
        confidenceNote: `Based on ${snap ? `forecast at ${snap.ts}` : "static zone attributes"} and ${reports.activeCount} active report(s). Rule-based draft — agent model lands with the AI lead.`,
      };
    }
  }
}

export const handler = route(async (event: ReqEvent): Promise<Res> => {
  const req = parseBody(AgentAskRequestSchema, event);
  if (req.execute) assertOps(event); // human confirmed: creating real work orders

  const zones = await scanZones();
  const z = pickZone(zones, req.zoneId);
  const [snap, reports, allReports] = await Promise.all([
    latestSnapshot(z.zoneId),
    activeReports(z.zoneId),
    Promise.all(zones.map((zone) => activeReports(zone.zoneId))),
  ]);
  const verifiedCount = reports.filter((r) => r.status === "verified").length;
  const activeCount = reports.filter((r) => r.status !== "rejected").length;

  const context: ZoneContext = {
    z,
    snap,
    reports: { verifiedCount, activeCount },
    nearby: zones.filter((n) => n.zoneId !== z.zoneId),
  };

  const intent = classifyIntent(req.question);
  const plan = planForIntent(intent, context, req.question, req.lang ?? "en");

  if (!req.execute) {
    return ok(AgentPlanSchema, plan);
  }

  // execute=true -> persist a work order (human in the loop confirmed); off-topic never writes.
  if (intent !== "offtopic" && plan.actions.length) {
    const id = `wo_${randomUUID().slice(0, 8)}`;
    await putWorkOrder({
      id,
      zoneId: z.zoneId,
      type: plan.actions[0].type,
      priority: plan.actions[0].priority,
      status: "open",
      note: `${plan.summary} ${plan.why[0] ?? ""}`.slice(0, 280),
      createdAt: new Date().toISOString(),
    });
    plan.workOrderIds = [id];
    plan.toolsUsed = [...plan.toolsUsed, "create_work_order"];
  }
  return ok(AgentPlanSchema, plan);
});
