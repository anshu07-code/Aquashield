/**
 * POST /route — safe-route alternatives scored against zone hazards.
 *
 * OWNED BY P4 (routing lead). This is the working baseline so the frontend is never
 * blocked: it generates 2 alternative polylines, scores them against current zone risk,
 * and recommends the safest. P4 replaces `generateAlternatives` with Amazon Location
 * Service / OSRM `alternatives=true` — keep the output contract (RouteResponseSchema).
 *
 * Score: durationMin + λ * Σ hazardWeight(tier), hazardWeight = SAFE 0 · WATCH 2 · HIGH 6 · CRITICAL 20.
 * A route crossing a CRITICAL zone is `unsafe` and never recommended if an alternative exists.
 */
import { RouteRequestSchema, RouteResponseSchema, type Tier } from "@aquashield/types";
import { route as wrap, ok, parseBody, validation, type ReqEvent, type Res } from "../shared/http.ts";
import { scanZones, type ZoneItem } from "../shared/db.ts";
import { haversineM, pointToSegmentM } from "../shared/geo.ts";

const HAZARD_WEIGHT: Record<Tier, number> = { SAFE: 0, WATCH: 2, HIGH: 6, CRITICAL: 20 };
const HAZARD_RADIUS_M = 40;     // polyline <-> zone proximity
const AVG_SPEED_KMH = 28;       // city driving assumption for the baseline router
const LAMBDA = 1;

type P = [number, number]; // [lng, lat]

function lerp(a: P, b: P, t: number): P {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Baseline alternatives. P4: replace with real routing provider, keep this shape. */
function generateAlternatives(origin: [number, number], dest: [number, number]): { id: string; geometry: P[]; durationMin: number; distanceKm: number }[] {
  const straight: P[] = Array.from({ length: 24 }, (_, i) => lerp(origin, dest, i / 23));
  const dist = haversineM({ lat: origin[1], lng: origin[0] }, { lat: dest[1], lng: dest[0] });

  // detour: bow the polyline to one side (perpendicular offset ~20% of distance)
  const mid = lerp(origin, dest, 0.5);
  const dx = dest[0] - origin[0];
  const dy = dest[1] - origin[1];
  const bow = Math.max(0.004, dist / 111320 * 0.2); // degrees-ish offset, at least ~400 m
  const off: P = [mid[0] - dy * 0.001 * 100, mid[1] + dx * 0.001 * 100];
  const scale = bow / (Math.hypot(off[0] - mid[0], off[1] - mid[1]) || 1);
  const pushed: P = [mid[0] + (off[0] - mid[0]) * scale, mid[1] + (off[1] - mid[1]) * scale];
  const detour: P[] = Array.from({ length: 32 }, (_, i) => {
    const t = i / 31;
    // quadratic bezier through `pushed`
    const a = lerp(origin, pushed, t);
    const b = lerp(pushed, dest, t);
    return lerp(a, b, t);
  });

  const detourDist = polylineLength(detour);
  const directDist = dist;
  return [
    { id: "r_fast", geometry: straight, durationMin: round1(directDist / 1000 / AVG_SPEED_KMH * 60), distanceKm: round1(directDist / 1000) },
    { id: "r_alt", geometry: detour, durationMin: round1(detourDist / 1000 / AVG_SPEED_KMH * 60), distanceKm: round1(detourDist / 1000) },
  ];
}

function polylineLength(poly: P[]): number {
  let m = 0;
  for (let i = 1; i < poly.length; i++) {
    m += haversineM({ lat: poly[i - 1][1], lng: poly[i - 1][0] }, { lat: poly[i][1], lng: poly[i][0] });
  }
  return m;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Zones whose centroid is within HAZARD_RADIUS_M of any polyline segment. */
function hazardsOf(poly: P[], zones: ZoneItem[]): Map<string, ZoneItem> {
  const hits = new Map<string, ZoneItem>();
  for (const z of zones) {
    for (let i = 1; i < poly.length; i++) {
      const d = pointToSegmentM(
        { lat: z.lat, lng: z.lng },
        { lat: poly[i - 1][1], lng: poly[i - 1][0] },
        { lat: poly[i][1], lng: poly[i][0] },
      );
      if (d <= HAZARD_RADIUS_M) {
        hits.set(z.zoneId, z);
        break;
      }
    }
  }
  return hits;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export const handler = wrap(async (event: ReqEvent): Promise<Res> => {
  const body = parseBody(RouteRequestSchema, event);
  const origin: [number, number] = [body.origin.lng, body.origin.lat];
  const dest: [number, number] = [body.destination.lng, body.destination.lat];

  if (haversineM(body.origin, body.destination) < 50) {
    throw validation("Origin and destination are the same place");
  }

  const zones = await scanZones();
  const candidates = generateAlternatives(origin, dest);

  const scored = candidates.map((c) => {
    const hazardMap = hazardsOf(c.geometry, zones);
    const hazards = [...hazardMap.values()].map((z) => ({
      zoneId: z.zoneId,
      name: z.name,
      tier: (z.tier ?? "SAFE") as Tier,
    }));
    const hazardSum = hazards.reduce((s, h) => s + HAZARD_WEIGHT[h.tier], 0);
    const score = round2(c.durationMin + LAMBDA * hazardSum);
    const unsafe = hazards.some((h) => h.tier === "CRITICAL");
    return { ...c, hazards, score, unsafe };
  });

  scored.sort((a, b) => a.score - b.score);
  const safe = scored.filter((s) => !s.unsafe);
  const recommendedId = (safe[0] ?? scored[0]).id;

  // summary sentence vs the fastest option: "Avoids 1 flooded underpass - +6 min"
  const fastest = [...scored].sort((a, b) => a.durationMin - b.durationMin)[0];
  const rec = scored.find((s) => s.id === recommendedId)!;
  const avoided = fastest.hazards
    .filter((h) => h.tier === "HIGH" || h.tier === "CRITICAL")
    .filter((h) => !rec.hazards.some((r) => r.zoneId === h.zoneId));
  const underpasses = avoided.filter((h) => zones.find((z) => z.zoneId === h.zoneId)?.isUnderpass).length;
  const extraMin = Math.round(rec.durationMin - fastest.durationMin);
  let summary: string;
  if (!avoided.length) {
    summary = `No flooded zones avoided - ${rec.durationMin} min`;
  } else if (underpasses > 0) {
    summary = `Avoids ${underpasses} flooded underpass${underpasses === 1 ? "" : "es"} - +${extraMin} min`;
  } else {
    summary = `Avoids ${avoided.length} flooded zone${avoided.length === 1 ? "" : "s"} - +${extraMin} min`;
  }

  return ok(RouteResponseSchema, {
    routes: scored.map((s) => ({
      id: s.id,
      geometry: s.geometry,
      durationMin: s.durationMin,
      distanceKm: s.distanceKm,
      hazards: s.hazards,
      score: s.score,
      unsafe: s.unsafe,
      recommended: s.id === recommendedId,
      summary: s.id === recommendedId ? summary : `Alternative - ${s.durationMin} min`,
    })),
  });
});
