import { readFileSync } from "node:fs";
import {
  ZoneListResponseSchema, ZoneDetailSchema, CreateReportResponseSchema,
  RouteResponseSchema, AgentPlanSchema, WorkOrderListResponseSchema,
  AlertListResponseSchema,
} from "../packages/types/src/index.ts";

const checks: [string, { parse: (v: unknown) => unknown }][] = [
  ["mocks/zones.json", ZoneListResponseSchema],
  ["mocks/zone-detail.json", ZoneDetailSchema],
  ["mocks/report-response.json", CreateReportResponseSchema],
  ["mocks/route-response.json", RouteResponseSchema],
  ["mocks/agent-plan.json", AgentPlanSchema],
  ["mocks/workorders.json", WorkOrderListResponseSchema],
  ["mocks/alerts.json", AlertListResponseSchema],
];
let failed = false;
for (const [file, schema] of checks) {
  try {
    schema.parse(JSON.parse(readFileSync(file, "utf8")));
    console.log("OK   ", file);
  } catch (e) {
    failed = true;
    console.error("FAIL ", file, e);
  }
}
if (failed) process.exit(1);
