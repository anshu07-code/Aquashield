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

// CORS headers for local dev
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
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
        const agentPlan = readMock("agent-plan.json");
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
