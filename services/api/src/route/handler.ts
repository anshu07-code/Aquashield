/**
 * services/api/src/route/handler.ts
 * ==================================
 * POST /route — safe-route alternatives scored against zone hazards.
 *
 * OWNED BY P4 (routing lead). Real routing via OSRM public endpoint
 * (router.project-osrm.org) — replaces the synthetic baseline router.
 *
 * Provider:     OSRM public endpoint (no API key required)
 * Fallback:      None in v1 — route failures return an error response.
 * Future:        Amazon Location Service CalculateRoutes can replace OSRM
 *                by swapping this module; the output contract stays identical.
 *
 * Flow:
 *   1. Validate origin/destination coords
 *   2. Call OSRM /route/v1/driving/{lng1},{lat1};{lng2},{lat2}?alternatives=3&overview=full&geometries=geojson
 *   3. Parse OSRM response, normalize geometry
 *   4. Load zone data via scanZones()
 *   5. For each route: find hazard zones within 40m of the route polyline
 *   6. Score each route: durationMin + λ × Σ(hazardWeight)
 *   7. Mark CRITICAL-crossing routes unsafe; never recommend one if a safer
 *      alternative exists
 *   8. Validate against RouteResponseSchema and return
 *
 * NOTE: This module has NO risk formula. Risk scoring uses routing-policy
 *       hazard weights (SAFE=0, WATCH=2, HIGH=6, CRITICAL=20). Risk values
 *       come from packages/risk-core via the Lambda's ingest pipeline.
 */

import { RouteRequestSchema, RouteResponseSchema, type Tier } from "@aquashield/types";
import { route as wrap, ok, parseBody, validation, type ReqEvent, type Res } from "../shared/http.ts";
import { scanZones, type ZoneItem } from "../shared/db.ts";
import { haversineM, pointToSegmentM } from "../shared/geo.ts";

// ---------- Config ----------

export const OSRM_BASE = "https://router.project-osrm.org";

/** Meters — a route within this distance of a zone center is considered "near" it. */
export const ZONE_PROXIMITY_M = 40;

/**
 * Routing-policy hazard weights (separate from risk-core formula).
 * Used only for route scoring, not for risk display.
 *
 * Interpretation: extra minutes added to travel time when crossing a zone.
 * SAFE  → no delay
 * WATCH → +2 min effective delay
 * HIGH  → +6 min effective delay
 * CRITICAL → +20 min effective delay
 */
export const HAZARD_WEIGHT: Record<Tier, number> = {
  SAFE: 0,
  WATCH: 2,
  HIGH: 6,
  CRITICAL: 20,
};

/**
 * λ (lambda) — multiplier applied to the sum of hazard weights when computing
 * the route score. Higher λ = risk-averse routing. Default 1.0.
 */
export const HAZARD_LAMBDA = 1.0;

export const OSRM_TIMEOUT_MS = 8_000;

// ---------- Types ----------

export interface ZoneHazard {
  zoneId: string;
  name: string;
  tier: "SAFE" | "WATCH" | "HIGH" | "CRITICAL";
}

export interface RouteStep {
  instruction: string;
  maneuver: string;
  distance: number;
  duration: number;
  streetName: string | null;
}

export interface RouteResult {
  id: string;
  geometry: [number, number][]; // [lng, lat][] — GeoJSON order
  durationMin: number;
  distanceKm: number;
  hazards: ZoneHazard[];
  score: number;
  unsafe: boolean;
  recommended: boolean;
  summary: string;
  steps: RouteStep[];
}

export interface ComputeRoutesInput {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  /**
   * Zones to check against. Caller typically fetches from DynamoDB.
   * Minimal shape: { id, name, lat, lng, tier }
   */
  zones: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
    tier: "SAFE" | "WATCH" | "HIGH" | "CRITICAL";
  }>;
}

export interface OsrmManeuver {
  type: string;
  modifier?: string;
  location?: [number, number];
  name?: string;
}

export interface OsrmStep {
  maneuver: OsrmManeuver;
  mode: string;
  name?: string;
  distance: number;  // meters
  duration: number;  // seconds
  instruction: string;
}

export interface OsrmLeg {
  steps: OsrmStep[];
  distance: number;
  duration: number;
  summary: string;
}

export interface OsrmRoute {
  geometry: { coordinates: [number, number][]; type: "LineString" };
  duration: number; // seconds
  distance: number;  // meters
  legs: OsrmLeg[];
}

export interface OsrmResponse {
  code: string;
  routes: OsrmRoute[];
  waypoints: Array<{ location: [number, number]; name: string }>;
}

// ---------- Public API ----------

/**
 * Compute safe routes between origin and destination using OSRM.
 * Returns routes ranked by score (lower = better), with hazard information.
 */
export async function computeRoutes(input: ComputeRoutesInput): Promise<{ routes: RouteResult[] }> {
  const { origin, destination, zones } = input;

  // Build OSRM URL
  const osrmUrl =
    `${OSRM_BASE}/route/v1/driving/` +
    `${origin.lng},${origin.lat};${destination.lng},${destination.lat}` +
    `?alternatives=3&overview=full&geometries=geojson&steps=true`;

  let osrmData: OsrmResponse;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "JalRakshak/1.0 (hackathon project)" },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM returned HTTP ${res.status}: ${res.statusText}`);
    }

    osrmData = (await res.json()) as OsrmResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort")) {
      throw new Error(`OSRM request timed out after ${OSRM_TIMEOUT_MS}ms`);
    }
    throw new Error(`OSRM request failed: ${msg}`);
  }

  if (osrmData.code !== "Ok" || !osrmData.routes || osrmData.routes.length === 0) {
    throw new Error(`OSRM returned no routes (code: ${osrmData.code}). Try different coordinates.`);
  }

  // Build RouteResults
  const results: RouteResult[] = [];

  for (let i = 0; i < osrmData.routes.length; i++) {
    const r = osrmData.routes[i];

    // Extract turn-by-turn steps from OSRM legs
    const steps = (r.legs[0]?.steps ?? []).map((step: OsrmStep) => ({
      instruction: step.instruction || maneuverInstruction(step.maneuver.type, step.maneuver.modifier, step.maneuver.name),
      maneuver: step.maneuver.type,
      distance: Math.round(step.distance),
      duration: Math.round(step.duration),
      streetName: step.name ?? null,
    }));

    const routeHazards = detectHazards(r.geometry.coordinates, zones);

    // Compute score
    const hazardSum = routeHazards.reduce((sum, h) => sum + HAZARD_WEIGHT[h.tier], 0);
    const score = Math.round(r.duration / 60 + HAZARD_LAMBDA * hazardSum);

    // Determine unsafe / recommended
    const crossesCritical = routeHazards.some((h) => h.tier === "CRITICAL");
    const unsafe = crossesCritical;

    const summary = buildSummary(routeHazards, r.duration / 60, r.distance / 1000, steps);

    results.push({
      id: `route_${i + 1}`,
      geometry: r.geometry.coordinates,
      durationMin: Math.round(r.duration / 60),
      distanceKm: Math.round((r.distance / 1000) * 10) / 10,
      hazards: routeHazards,
      score,
      unsafe,
      recommended: false, // set below after ranking
      summary,
      steps,
    });
  }

  // Rank: lower score = better. Mark recommended.
  // Rule: never recommend a route that crosses CRITICAL if a safer alternative exists.
  if (results.length === 1) {
    results[0].recommended = true; // only option
  } else {
    // Sort by score ascending (best first)
    results.sort((a, b) => a.score - b.score);

    const safeRoutes = results.filter((r) => !r.unsafe);
    if (safeRoutes.length > 0) {
      // Mark the best safe route as recommended
      safeRoutes[0].recommended = true;
    } else {
      // Every route is unsafe — recommend the least-bad one (lowest score)
      results[0].recommended = true;
    }
  }

  // Validate against schema
  const parsed = RouteResponseSchema.parse({ routes: results });
  return parsed as unknown as { routes: RouteResult[] };
}

// ---------- Hazard detection ----------

/**
 * Find all zones within ZONE_PROXIMITY_M of the route polyline.
 * Checks every segment (not just vertices) for accuracy.
 * Uses the shared pointToSegmentM (metres) helper.
 */
export function detectHazards(
  coords: [number, number][],
  zones: ComputeRoutesInput["zones"]
): ZoneHazard[] {
  if (coords.length < 2 || zones.length === 0) return [];

  const hazards: ZoneHazard[] = [];

  for (const zone of zones) {
    for (let i = 1; i < coords.length; i++) {
      const d = pointToSegmentM(
        { lat: zone.lat, lng: zone.lng },
        { lat: coords[i - 1][1], lng: coords[i - 1][0] },
        { lat: coords[i][1], lng: coords[i][0] },
      );
      if (d <= ZONE_PROXIMITY_M) {
        hazards.push({ zoneId: zone.id, name: zone.name, tier: zone.tier });
        break;
      }
    }
  }

  return hazards;
}

// ---------- Summary text ----------

function maneuverInstruction(type: string, modifier?: string, name?: string): string {
  const mod = modifier ? `${modifier} ` : "";
  if (!name) return `${mod}${type}`.trim();
  return `Turn ${mod}onto ${name}`;
}

function buildSummary(
  hazards: ZoneHazard[],
  durationMin: number,
  distanceKm: number,
  steps: { instruction: string }[],
): string {
  const turnCount = steps.filter((s) =>
    /^(turn|merge|depart|arrive| roundabout|rotary|passing)$/.test(s.instruction.toLowerCase()),
  ).length;

  if (hazards.length === 0) {
    const turnStr = turnCount > 0 ? `, ${turnCount} turn${turnCount !== 1 ? "s" : ""}` : "";
    return `${Math.round(durationMin)} min, ${distanceKm.toFixed(1)} km — fastest route${turnStr}`;
  }

  const counts = { SAFE: 0, WATCH: 0, HIGH: 0, CRITICAL: 0 };
  for (const h of hazards) counts[h.tier]++;

  const parts: string[] = [];
  if (counts.CRITICAL > 0) parts.push(`${counts.CRITICAL} CRITICAL`);
  if (counts.HIGH > 0) parts.push(`${counts.HIGH} HIGH`);
  if (counts.WATCH > 0) parts.push(`${counts.WATCH} WATCH`);
  const hazardStr = parts.join(", ");

  if (counts.CRITICAL > 0) {
    return `Crosses ${hazardStr} — unsafe, ${Math.round(durationMin)} min${turnCount > 0 ? `, ${turnCount} turns` : ""}`;
  }

  const extraMin = Math.round(HAZARD_LAMBDA * hazards.reduce((s, h) => s + HAZARD_WEIGHT[h.tier], 0));
  return `Avoids ${hazardStr} — +${extraMin} min, ${Math.round(durationMin)} min total, ${distanceKm.toFixed(1)} km${turnCount > 0 ? `, ${turnCount} turns` : ""}`;
}

// ---------- Lambda handler ----------

/**
 * POST /route — Lambda handler. Wraps computeRoutes with the shared HTTP
 * error handling, validates the request body, loads zones from DynamoDB,
 * and returns a schema-validated RouteResponse.
 */
export const handler = wrap(async (event: ReqEvent): Promise<Res> => {
  const body = parseBody(RouteRequestSchema, event);

  if (haversineM(body.origin, body.destination) < 50) {
    throw validation("Origin and destination are the same place");
  }

  const zoneItems = await scanZones();

  const zones = zoneItems.map((z: ZoneItem): ComputeRoutesInput["zones"][number] => ({
    id: z.zoneId,
    name: z.name,
    lat: z.lat,
    lng: z.lng,
    tier: (z.tier ?? "SAFE") as "SAFE" | "WATCH" | "HIGH" | "CRITICAL",
  }));

  const { routes } = await computeRoutes({ origin: body.origin, destination: body.destination, zones });

  return ok(RouteResponseSchema, { routes });
});

// ---------- Re-exports for convenience ----------

export type { RouteOption } from "@aquashield/types";
