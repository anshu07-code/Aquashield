/**
 * services/api/src/route/__tests__/handler.test.ts
 * Tests for the OSRM routing handler. All external OSRM calls are mocked.
 * Run: npx tsx --test services/api/src/route/__tests__/handler.test.ts
 */
import { test, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import {
  computeRoutes,
  detectHazards,
  HAZARD_WEIGHT,
  HAZARD_LAMBDA,
  ZONE_PROXIMITY_M,
} from "../handler.js";

const ZONES = [
  { id: "z_minto", name: "Minto Bridge Underpass", lat: 28.6328, lng: 77.2197, tier: "CRITICAL" as const },
  { id: "z_prahladpur", name: "Pul Prahladpur Underpass", lat: 28.5047, lng: 77.2900, tier: "HIGH" as const },
  { id: "z_zakhira", name: "Zakhira Underpass", lat: 28.6657, lng: 77.1535, tier: "SAFE" as const },
  { id: "z_ito", name: "ITO Intersection", lat: 28.6289, lng: 77.2406, tier: "WATCH" as const },
];

interface RouteFixtureInput {
  duration: number;
  distance: number;
  coords: [number, number][];
}

function osrmResp(routes: RouteFixtureInput[]) {
  return {
    code: "Ok",
    routes: routes.map((r) => ({
      geometry: { type: "LineString", coordinates: r.coords },
      duration: r.duration,
      distance: r.distance,
      legs: [],
    })),
    waypoints: [
      { location: routes[0].coords[0], name: "origin" },
      { location: routes[0].coords[routes[0].coords.length - 1], name: "dest" },
    ],
  };
}

function mockFetch(osrmResponse: unknown, status = 200) {
  return mock.method(globalThis, "fetch", () =>
    Promise.resolve({ ok: status >= 200 && status < 300, status, statusText: "", json: () => Promise.resolve(osrmResponse) })
  );
}

afterEach(() => {
  // Cleanup is handled by the mock infrastructure automatically.
  // Note: mock.restore() from node:test takes no argument and restores all mocks.
  // Using mock.method() on globalThis.mockFetch is sufficient for test isolation.
});

// ---------- OSRM: multiple alternatives ----------

test("computeRoutes: valid response with 2 alternatives", async () => {
  const coords1: [number, number][] = [[77.2197, 28.6328], [77.2300, 28.6300], [77.2400, 28.6280]];
  const coords2: [number, number][] = [[77.2197, 28.6328], [77.2100, 28.6400], [77.2000, 28.6350]];
  mockFetch(osrmResp([{ duration: 900, distance: 12000, coords: coords1 }, { duration: 1300, distance: 16000, coords: coords2 }]));
  const result = await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6280, lng: 77.2400 }, zones: ZONES });
  assert.equal(result.routes.length, 2);
  assert.equal(typeof result.routes[0].durationMin, "number");
  assert.equal(typeof result.routes[0].distanceKm, "number");
  assert.equal(typeof result.routes[0].score, "number");
  assert.equal(typeof result.routes[0].unsafe, "boolean");
  assert.equal(typeof result.routes[0].recommended, "boolean");
  assert.equal(typeof result.routes[0].summary, "string");
  assert.ok(Array.isArray(result.routes[0].geometry));
  assert.ok(result.routes[0].geometry.length >= 2);
  assert.equal(result.routes[0].geometry[0].length, 2); // [lng, lat]
  assert.ok(result.routes.filter((r) => r.recommended).length === 1);
});

// ---------- OSRM: single route ----------

test("computeRoutes: single route is auto-recommended", async () => {
  const coords: [number, number][] = [[77.2197, 28.6328], [77.2300, 28.6350]];
  mockFetch(osrmResp([{ duration: 720, distance: 9500, coords }]));
  const result = await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6350, lng: 77.2300 }, zones: [] });
  assert.equal(result.routes.length, 1);
  assert.equal(result.routes[0].recommended, true);
  assert.equal(result.routes[0].hazards.length, 0);
});

// ---------- OSRM: no routes ----------

test("computeRoutes: throws when OSRM returns NoRoute", async () => {
  mockFetch({ code: "NoRoute", routes: [], waypoints: [] });
  try {
    await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6280, lng: 77.2400 }, zones: [] });
    assert.fail("Expected error");
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok(err.message.includes("NoRoute") || err.message.includes("no routes"));
  }
});

// ---------- OSRM: HTTP error ----------

test("computeRoutes: throws on HTTP 429", async () => {
  mockFetch({}, 429);
  try {
    await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6280, lng: 77.2400 }, zones: [] });
    assert.fail("Expected error");
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok(err.message.includes("429") || err.message.includes("failed"));
  }
});

// ---------- OSRM: timeout ----------

test("computeRoutes: throws on fetch timeout", async () => {
  mock.method(globalThis, "fetch", (_url: string | URL | Request, options?: RequestInit) => {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => resolve(undefined), 10_000);
      if (options?.signal) {
        const handler = () => { clearTimeout(id); reject(new Error("fetch aborted")); };
        if (options.signal.aborted) { handler(); }
        else { options.signal.addEventListener("abort", handler, { once: true }); }
      }
    }) as unknown as typeof fetch;
  });
  try {
    await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6280, lng: 77.2400 }, zones: [] });
    assert.fail("Expected timeout error");
  } catch (err) {
    assert.ok(err instanceof Error);
    assert.ok(err.message.includes("timed out") || err.message.includes("timeout"));
  }
});

// ---------- OSRM: malformed JSON ----------

test("computeRoutes: throws on JSON parse error", async () => {
  mock.method(globalThis, "fetch", () => Promise.resolve({
    ok: true, status: 200, statusText: "", json: () => Promise.reject(new Error("Unexpected token"))
  }) as unknown as Response);
  try {
    await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6280, lng: 77.2400 }, zones: [] });
    assert.fail("Expected error");
  } catch (err) {
    assert.ok(err instanceof Error);
  }
});

// ---------- Hazard detection ----------

test("detectHazards: finds zone at route vertex (exact match)", () => {
  const routeCoords: [number, number][] = [[77.2197, 28.6328], [77.2200, 28.6330]];
  const hazards = detectHazards(routeCoords, ZONES);
  const minto = hazards.find((h) => h.zoneId === "z_minto");
  assert.ok(minto, `Minto should be detected. Got: ${JSON.stringify(hazards)}`);
  assert.equal(minto?.tier, "CRITICAL");
});

test("detectHazards: ignores zones far (>40m) from route", () => {
  const routeCoords: [number, number][] = [[77.0000, 28.5000], [77.0010, 28.5010]];
  const hazards = detectHazards(routeCoords, ZONES);
  assert.equal(hazards.length, 0);
});

test("detectHazards: detects ITO (WATCH) when route passes through it", () => {
  const routeCoords: [number, number][] = [[77.2406, 28.6289], [77.2410, 28.6292]];
  const hazards = detectHazards(routeCoords, ZONES);
  const ito = hazards.find((h) => h.zoneId === "z_ito");
  assert.ok(ito, `ITO should be detected. Got: ${JSON.stringify(hazards)}`);
  assert.equal(ito?.tier, "WATCH");
});

test("detectHazards: empty zones returns empty", () => {
  const routeCoords: [number, number][] = [[77.2197, 28.6328], [77.2200, 28.6330]];
  assert.equal(detectHazards(routeCoords, []).length, 0);
});

test("detectHazards: single-point route returns empty", () => {
  assert.equal(detectHazards([[77.2197, 28.6328]], ZONES).length, 0);
});

test("detectHazards: accounts for route segments (not just vertices)", () => {
  // Segment from [77.2185,28.6315] to [77.2205,28.6335] passes through Minto at 77.2197,28.6328
  const routeCoords: [number, number][] = [[77.2185, 28.6315], [77.2205, 28.6335]];
  const hazards = detectHazards(routeCoords, ZONES);
  const minto = hazards.find((h) => h.zoneId === "z_minto");
  assert.ok(minto, `Minto should be detected via segment proximity. Got: ${JSON.stringify(hazards)}`);
});

// ---------- Scoring & recommendation ----------

test("computeRoutes: CRITICAL-crossing route marked unsafe", async () => {
  // Route goes exactly through Minto Bridge (CRITICAL)
  const throughMinto: [number, number][] = [[77.2197, 28.6328], [77.2250, 28.6300], [77.2300, 28.6350]];
  mockFetch(osrmResp([{ duration: 900, distance: 12000, coords: throughMinto }]));
  const result = await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6350, lng: 77.2300 }, zones: ZONES });
  assert.ok(result.routes[0].unsafe, "Route through Minto should be marked unsafe");
  assert.ok(result.routes[0].hazards.some((h) => h.tier === "CRITICAL"));
});

test("computeRoutes: SAFE route recommended over CRITICAL even if slower", async () => {
  // Both routes share the same origin/destination (west of Minto).
  // fastCritical cuts through Minto (CRITICAL); slowSafe detours north to avoid it.
  const fastCritical: [number, number][] = [[77.2000, 28.6360], [77.2197, 28.6328], [77.2350, 28.6260]];
  const slowSafe: [number, number][] = [[77.2000, 28.6360], [77.2150, 28.6355], [77.2250, 28.6335], [77.2350, 28.6260]];
  mockFetch(osrmResp([
    { duration: 600, distance: 7000, coords: fastCritical },
    { duration: 1100, distance: 14000, coords: slowSafe },
  ]));
  const result = await computeRoutes({ origin: { lat: 28.6360, lng: 77.2000 }, destination: { lat: 28.6260, lng: 77.2350 }, zones: ZONES });
  const recommended = result.routes.find((r) => r.recommended);
  assert.ok(recommended, "There must be a recommended route");
  assert.ok(!recommended.unsafe, "Recommended route should not be unsafe when safe alternative exists");
  assert.ok(recommended.durationMin >= result.routes[1].durationMin, "Safe route is not the faster one");
});

test("computeRoutes: all CRITICAL — least-bad (lowest score) recommended", async () => {
  const route1: [number, number][] = [[77.2197, 28.6328], [77.2250, 28.6300]];
  const route2: [number, number][] = [[77.2197, 28.6328], [77.2150, 28.6400], [77.2100, 28.6300]];
  mockFetch(osrmResp([
    { duration: 600, distance: 7000, coords: route1 },
    { duration: 1200, distance: 15000, coords: route2 },
  ]));
  const result = await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6300, lng: 77.2250 }, zones: ZONES });
  const recommended = result.routes.find((r) => r.recommended);
  assert.ok(recommended, "Must recommend something");
  // Both are unsafe (Minto CRITICAL), so least-bad should be recommended
  // Route 1: score = 10 + 20 = 30. Route 2: score = 20 + 20 = 40 → route1 recommended
  assert.equal(recommended.id, "route_1");
});

// ---------- Hazard weights are configurable ----------

test("HAZARD_WEIGHT is properly defined", () => {
  assert.equal(HAZARD_WEIGHT.SAFE, 0);
  assert.equal(HAZARD_WEIGHT.WATCH, 2);
  assert.equal(HAZARD_WEIGHT.HIGH, 6);
  assert.equal(HAZARD_WEIGHT.CRITICAL, 20);
});

test("ZONE_PROXIMITY_M is 40 meters", () => {
  assert.equal(ZONE_PROXIMITY_M, 40);
});

test("HAZARD_LAMBDA defaults to 1.0", () => {
  assert.equal(HAZARD_LAMBDA, 1.0);
});

test("hazard scoring: score = durationMin + λ × Σ(hazardWeight)", async () => {
  // Route through Minto (CRITICAL, weight=20) with 600s = 10min
  const mintoCoords: [number, number][] = [[77.2197, 28.6328], [77.2200, 28.6330]];
  mockFetch(osrmResp([{ duration: 600, distance: 5000, coords: mintoCoords }]));
  const result = await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6330, lng: 77.2200 }, zones: ZONES });
  const route = result.routes[0];
  const expectedScore = Math.round(600 / 60) + HAZARD_LAMBDA * HAZARD_WEIGHT.CRITICAL;
  assert.equal(route.score, expectedScore, `Expected score=${expectedScore}, got ${route.score}`);
});

// ---------- Response schema validation ----------

test("computeRoutes output validates against RouteResponseSchema", async () => {
  const coords: [number, number][] = [[77.2197, 28.6328], [77.2300, 28.6350]];
  mockFetch(osrmResp([{ duration: 720, distance: 9500, coords }]));
  const result = await computeRoutes({ origin: { lat: 28.6328, lng: 77.2197 }, destination: { lat: 28.6350, lng: 77.2300 }, zones: ZONES });
  // If parse succeeds, schema is satisfied
  const { RouteResponseSchema } = await import("@aquashield/types");
  const parsed = RouteResponseSchema.parse(result);
  assert.ok(parsed.routes.length >= 1);
});