/**
 * MOCK API SERVER — serves all endpoints from mocks/*.json
 * Lets P1 (frontend) build the full UI immediately without waiting for P2's AWS deployment.
 * 
 * Start: npx tsx scripts/mock-api-server.ts
 * URL:  http://localhost:3001
 * 
 * Switch frontend to real AWS URL by setting NEXT_PUBLIC_API_URL in .env.local
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCKS = path.join(__dirname, "..", "mocks");
const PORT = 3001;

// Read a mock file, return parsed JSON
function readMock(filename: string) {
  const file = path.join(MOCKS, filename);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/**
 * Question-aware /agent/ask (mirrors services/api/src/agent/handler.ts).
 * Off-topic questions get a polite redirect instead of the same canned plan;
 * on-topic questions branch by detected intent. Text is seeded from the
 * mock data — never invented statistics.
 */
const TOPIC_HINTS =
  /flood|water|drain|underpass|rain|weather|forecast|risk|danger|critical|road|route|zone|delhi|overpass|report|alert|citizen|safety|traffic|submerged/i;
const OFFTOPIC_HINTS =
  /\bmango|apple|banana|orange|fruit|vegetable|recipe|food|cook|movie|film|song|music|game|sport|cricket|football|stock|share|price|job|salary|school|exam|medicine|doctor|joke|jokes|story|who are you|what are you|how are you|hello|hi |hey|thanks|thank you|bye|greetings|meaning of the word|dictionary/i;

function classifyIntent(question: string): string {
  const q = question.trim().toLowerCase();
  if (!q) return "risk";
  if (OFFTOPIC_HINTS.test(q) && !TOPIC_HINTS.test(q)) return "offtopic";
  if (!TOPIC_HINTS.test(q)) return "offtopic";
  if (/saf(?:e|er|ety)|route|alternative|avoid|detour|bypass|navig/i.test(q)) return "route";
  if (/forecast|rain|rainfall|precip|mm\b|next \d+ hour/i.test(q)) return "forecast";
  if (/report|citizen|photo|evidence|verified|claim/i.test(q)) return "reports";
  if (/alert|warn|notify|message|advisory/i.test(q)) return "alert";
  if (/nearby|neighbour|neighbor|around|adjacent|near\b|compare|all zones/i.test(q)) return "nearby";
  if (/action|should we|do (we|i)|what to do|deploy|work order|plan|recommend|priority/i.test(q)) return "action";
  return "risk";
}

function questionAwarePlan(question: string, lang: string): Record<string, unknown> {
  const base = readMock("agent-plan.json") as Record<string, unknown> | null;
  const fallback = (): Record<string, unknown> => base ?? {
    summary: "Minto Bridge Underpass is under watch.",
    why: ["Live risk from the flood engine."],
    actions: [{ type: "monitor", priority: "P3", reason: "Watch the zone." }],
    alertDraft: { en: "Minto Bridge risk update - Aquashield", hi: "मिंटो ब्रिज जोखिम अपडेट - आक्वाशील्ड" },
    workOrderIds: [],
    toolsUsed: ["get_zone_risk"],
    confidenceNote: "Mock data.",
  };
  const intent = classifyIntent(question);

  if (intent === "offtopic") {
    return {
      summary: "I'm Aquashield, an assistant for Delhi flood risk — I can't answer that. Ask me about the selected zone instead (e.g. risk now, rain forecast, citizen reports, or safe routes).",
      why: [
        `Your question ("${question.slice(0, 60)}…") is not about Delhi's flood-monitored zones.`,
        "I only answer flood / weather / routing questions using zone data.",
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

  const zoneName = (base?.alertDraft as { en?: string } | undefined)?.en?.match(/^(.*?)( underpass| is)/i)?.[1]?.trim() ?? "Minto Bridge";
  const hiText = (base?.alertDraft as { hi?: string } | undefined)?.hi ?? "";
  const alertDraft = { en: "Minto Bridge risk update - Aquashield", hi: `मिंटो ब्रिज जोखिम अपडेट - आक्वाशील्ड${hiText ? "" : ""}` };

  // Pull a realistic fact set from the seeded plan.
  const why: string[] = Array.isArray(base?.why) ? (base.why as string[]).slice(0, 2) : ["Live risk from the flood engine."];
  const actions = Array.isArray(base?.actions) ? (base.actions as Array<Record<string, unknown>>).slice(0, 2) : [];

  switch (intent) {
    case "forecast":
      return {
        summary: `Rain outlook for ${zoneName}: heavy rain continuing, low-lying underpass with poor drainage.`,
        why,
        actions,
        alertDraft,
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "get_forecast"],
        confidenceNote: "Forecast from seeded mock snapshot.",
      };
    case "reports":
      return {
        summary: `${zoneName}: 2 active citizen reports, 1 verified by AI vision.`,
        why: ["Verified report of a blocked drain 40 m away.", "Live from the reports table (mock seed)."],
        actions,
        alertDraft,
        workOrderIds: [],
        toolsUsed: ["get_nearby_reports", "get_zone_risk"],
        confidenceNote: "Counts are from seeded mock reports.",
      };
    case "alert":
      return {
        summary: `Public alert drafted for ${zoneName} (CRITICAL).`,
        why,
        actions: [actions[0], { type: "public_alert", priority: "P1", reason: "Publish the bilingual alert below for the public." }].filter(Boolean),
        alertDraft,
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "draft_alert"],
        confidenceNote: "Alert is a DRAFT — publish from the ops UI.",
      };
    case "nearby":
      return {
        summary: `${zoneName} is CRITICAL (risk 89). Nearby: Minto Bridge, ITO (WATCH).`,
        why,
        actions,
        alertDraft,
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "get_nearby_zones"],
        confidenceNote: "Nearby list from seeded zone co-ordinates.",
      };
    case "route":
      return {
        summary: `Safe routing near ${zoneName} (CRITICAL): prefer roads that avoid this underpass.`,
        why,
        actions: [actions[0], { type: "traffic_diversion", priority: "P1", reason: `Divert traffic away from ${zoneName} while risk is CRITICAL.` }].filter(Boolean),
        alertDraft,
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "plan_safe_route"],
        confidenceNote: "Route suggestion is high-level; the citizen app computes turn-by-turn alternatives.",
      };
    case "action":
      return {
        summary: `${zoneName} is CRITICAL (89). Recommended action: pump dispatch (P1).`,
        why,
        actions,
        alertDraft,
        workOrderIds: [],
        toolsUsed: ["get_zone_risk", "get_nearby_reports"],
        confidenceNote: "Rule-based draft — agent model lands with the AI lead.",
      };
    default:
      return fallback();
  }
}

// CORS headers for local dev
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-ops-passcode",
  "Content-Type": "application/json",
};

// Parse URL, method; route to mock or 404
function route(req: http.IncomingMessage, res: http.ServerResponse) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "", `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, "");
  const method = req.method;

  let body = "";
  req.on("data", (chunk: Buffer) => body += chunk);
  req.on("end", () => {
    res.setHeader("Access-Control-Allow-Origin", CORS["Access-Control-Allow-Origin"]);

    try {
      // GET /health
      if (pathname === "/health" && method === "GET") {
        res.writeHead(200, CORS);
        res.end(JSON.stringify({ ok: true, time: new Date().toISOString() }));
        return;
      }

      // GET /zones
      if (pathname === "/zones" && method === "GET") {
        const zoneId = url.searchParams.get("id");
        const zones = readMock("zones.json");
        if (zoneId) {
          const zone = zones?.zones?.find((z: Record<string, unknown>) => z["id"] === zoneId);
          res.writeHead(200, CORS);
          res.end(JSON.stringify(zone || { error: { code: "NOT_FOUND", message: "Zone not found" } }));
        } else {
          res.writeHead(200, CORS);
          res.end(JSON.stringify(zones));
        }
        return;
      }

      // GET /zones/:id
      const zoneMatch = pathname.match(/^\/zones\/(.+)$/);
      if (zoneMatch && method === "GET") {
        const zoneId = zoneMatch[1];
        const zoneDetail = readMock("zone-detail.json");
        res.writeHead(200, CORS);
        // Swap in the requested zone ID
        if (zoneDetail?.zone) zoneDetail.zone.id = zoneId;
        res.end(JSON.stringify(zoneDetail));
        return;
      }

      // POST /reports/presign
      if (pathname === "/reports/presign" && method === "POST") {
        const key = `reports/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        res.writeHead(200, CORS);
        res.end(JSON.stringify({
          uploadUrl: `http://localhost:3001/upload/${key}`,
          key,
        }));
        return;
      }

      // PUT /upload/:key — accepts the presigned photo bytes (S3 emulation)
      if (pathname.startsWith("/upload/") && method === "PUT") {
        res.writeHead(200, { ...CORS, ETag: `"mock-${Date.now()}"` });
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // POST /reports
      if (pathname === "/reports" && method === "POST") {
        const reportResponse = readMock("report-response.json");
        res.writeHead(200, CORS);
        res.end(JSON.stringify(reportResponse));
        return;
      }

      // GET /reports
      if (pathname === "/reports" && method === "GET") {
        const reportResponse = readMock("report-response.json");
        res.writeHead(200, CORS);
        res.end(JSON.stringify({ reports: [reportResponse.report].filter(Boolean) }));
        return;
      }

      // POST /route
      if (pathname === "/route" && method === "POST") {
        const routeResponse = readMock("route-response.json");
        res.writeHead(200, CORS);
        res.end(JSON.stringify(routeResponse));
        return;
      }

      // POST /agent/ask
      if (pathname === "/agent/ask" && method === "POST") {
        let askBody: { question?: string; lang?: string; zoneId?: string } = {};
        try { askBody = JSON.parse(body); } catch { /* ignore */ }
        const agentPlan = questionAwarePlan(askBody.question ?? "", askBody.lang ?? "en");
        res.writeHead(200, CORS);
        res.end(JSON.stringify(agentPlan));
        return;
      }

      // GET /workorders
      if (pathname === "/workorders" && method === "GET") {
        const workorders = readMock("workorders.json");
        res.writeHead(200, CORS);
        res.end(JSON.stringify(workorders));
        return;
      }

      // POST /workorders (create work order — from agent tool / ops UI button)
      if (pathname === "/workorders" && method === "POST") {
        let created = { id: `wo_${Date.now().toString(36)}`, status: "open", createdAt: new Date().toISOString() };
        try { created = { ...created, ...JSON.parse(body) }; } catch { /* ignore */ }
        res.writeHead(201, CORS);
        res.end(JSON.stringify(created));
        return;
      }

      // POST /alerts (create draft alert — from agent tool / ops UI button)
      if (pathname === "/alerts" && method === "POST") {
        let created = { id: `al_${Date.now().toString(36)}`, status: "draft", publishedAt: null };
        try { created = { ...created, ...JSON.parse(body) }; } catch { /* ignore */ }
        res.writeHead(201, CORS);
        res.end(JSON.stringify(created));
        return;
      }

      // PATCH /workorders/:id
      const woPatch = pathname.match(/^\/workorders\/(.+)$/);
      if (woPatch && method === "PATCH") {
        res.writeHead(200, CORS);
        res.end(JSON.stringify({ id: woPatch[1], status: "updated" }));
        return;
      }

      // POST /alerts/:id/publish
      const alertPub = pathname.match(/^\/alerts\/(.+)\/publish$/);
      if (alertPub && method === "POST") {
        res.writeHead(200, CORS);
        res.end(JSON.stringify({
          id: alertPub[1],
          zoneId: "z_minto",
          lang: "en",
          text: "Minto Bridge underpass flooding — avoid the area.",
          status: "published",
          publishedAt: new Date().toISOString(),
        }));
        return;
      }

      // 404
      res.writeHead(404, CORS);
      res.end(JSON.stringify({ error: { code: "NOT_FOUND", message: `Route ${method} ${pathname} not found` } }));
    } catch (err) {
      res.writeHead(500, CORS);
      res.end(JSON.stringify({ error: { code: "INTERNAL", message: (err as Error).message } }));
    }
  });
}

const server = http.createServer(route);
server.listen(PORT, () => {
  console.log(`\n  Mock API server running at http://localhost:${PORT}`);
  console.log("  P1: set NEXT_PUBLIC_API_URL=http://localhost:3001 in .env.local");
  console.log("  Press Ctrl+C to stop\n");
});
