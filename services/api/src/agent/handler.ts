/**
 * POST /agent/ask — Ask Aquashield action plan.
 *
 * Contract: AgentAskRequest -> AgentPlan (packages/types). execute=false returns a plan only;
 * execute=true (set by a human click in the UI) lets the plan create work orders.
 * Ops passcode required when execute=true.
 *
 * THIS IS A DATA-GROUNDED PLACEHOLDER so P1's ops dashboard works today.
 * P3 (AI lead) replaces the plan builder with the Strands/Bedrock agent — keep the
 * contract identical and keep the rules: facts from data only, never invented.
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

export const handler = route(async (event: ReqEvent): Promise<Res> => {
  const req = parseBody(AgentAskRequestSchema, event);
  if (req.execute) assertOps(event); // human confirmed: creating real work orders

  const zones = await scanZones();
  const z = pickZone(zones, req.zoneId);
  const [snap, reports] = await Promise.all([latestSnapshot(z.zoneId), activeReports(z.zoneId)]);
  const risk = snap?.risk ?? z.risk ?? 0;
  const tier = snap?.tier ?? z.tier ?? "SAFE";
  const verifiedCount = reports.filter((r) => r.status === "verified").length;
  const activeCount = reports.filter((r) => r.status !== "rejected").length;

  const action = ACTION_FOR_TIER[tier] ?? ACTION_FOR_TIER.WATCH;
  const why: string[] = [];
  if (snap?.topReasons?.length) why.push(...snap.topReasons);
  if (!why.length) why.push("No forecast snapshot yet — baseline risk from static zone attributes");
  if (activeCount) why.push(`${activeCount} active citizen report${activeCount === 1 ? "" : "s"} (${verifiedCount} verified)`);
  const eta = snap?.etaMin;
  if (eta === 0) why.push("Zone is already CRITICAL");
  else if (eta !== undefined && eta !== null) why.push(`ETA to CRITICAL: ~${eta} min`);

  const plan: AgentPlan = {
    summary: `${z.name} is ${tier} (${risk}/100).`,
    why,
    actions: [
      { type: action.type, priority: action.priority, reason: `Tier ${tier} at ${z.name} (risk ${risk})` },
    ],
    alertDraft: alertTexts(z, snap),
    workOrderIds: [],
    toolsUsed: ["get_zone_risk", "get_nearby_reports"],
    confidenceNote: `Based on ${snap ? `forecast at ${snap.ts}` : "static zone attributes"} and ${activeCount} active report(s). Rule-based draft — agent model lands with the AI lead.`,
  };

  if (!req.execute) {
    return ok(AgentPlanSchema, plan);
  }

  // execute=true -> persist a work order (human in the loop confirmed)
  const id = `wo_${randomUUID().slice(0, 8)}`;
  await putWorkOrder({
    id,
    zoneId: z.zoneId,
    type: action.type,
    priority: action.priority,
    status: "open",
    note: `${plan.summary} ${why[0] ?? ""}`.slice(0, 280),
    createdAt: new Date().toISOString(),
  });
  plan.workOrderIds = [id];
  plan.toolsUsed = [...plan.toolsUsed, "create_work_order"];
  return ok(AgentPlanSchema, plan);
});
