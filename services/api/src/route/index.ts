/**
 * services/api/src/route/index.ts
 * Routing module public API.
 */
export {
  computeRoutes,
  detectHazards,
  HAZARD_WEIGHT,
  HAZARD_LAMBDA,
  ZONE_PROXIMITY_M,
  OSRM_TIMEOUT_MS,
  type RouteResult,
  type ComputeRoutesInput,
  type ZoneHazard,
} from "./handler.js";
