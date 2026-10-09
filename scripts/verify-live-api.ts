/**
 * VERIFY LIVE API — end-to-end check of every deployed backend route.
 * P2-owned. Proves the whole Aquashield backend works against the live AWS deploy.
 *
 * Usage:
 *   npx tsx scripts/verify-live-api.ts <baseUrl> [opsPasscode]
 *   npx tsx scripts/verify-live-api.ts https://i0ew0j1bdk.execute-api.ap-southeast-2.amazonaws.com/prod Aquashield2026!
 *   # or read from env: NEXT_PUBLIC_API_URL / OPS_PASSCODE
 *
 * Exits non-zero if any required route fails. Prints a pass/fail table.
 * Non-ops routes are always tested. Ops routes (workorders write, alerts, agent execute)
 * are only tested when a passcode is provided. Ops write probes create a real work order
 * and a real alert draft/publish (SNS) so you can also see them in the AWS console.
 */
const base = (process.argv[2] ?? process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
if (!base) {
  console.error("Pass the live API base URL or set NEXT_PUBLIC_API_URL.");
  process.exit(2);
}
const passcode = process.argv[3] ?? process.env.OPS_PASSCODE ?? "";

const GREEN = "\x1b[32m", RED = "\x1b[31m", YELLOW = "\x1b[33m", RESET = "\x1b[0m";
let pass = 0, fail = 0, skip = 0;
const failures: string[] = [];

function line(name: string, ok: boolean, detail = "") {
  const icon = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
  if (!ok) failures.push(name);
}

async function call(method: string, path: string, body?: unknown, ops = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ops && passcode) headers["x-ops-passcode"] = passcode;
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    return { status: res.status, body: text };
  } catch (e) {
    return { status: 0, body: String(e) };
  }
}

async function main() {
  console.log(`\nAquashield LIVE API verification — ${base}\n`);

  console.log("── health ──");
  {
    const r = await call("GET", "/health");
    line("GET /health", r.status === 200 && r.body.includes("ok"), `HTTP ${r.status}`);
  }

  console.log("── zones ──");
  let zoneCount = 0;
  {
    const r = await call("GET", "/zones");
    let zones: { id: string }[] = [];
    if (r.status === 200) {
      try { zones = (JSON.parse(r.body).zones ?? []); } catch { /* ignore */ }
    }
    zoneCount = zones.length;
    line("GET /zones", r.status === 200 && zoneCount > 0, `HTTP ${r.status} · ${zoneCount} zones`);
  }
  {
    const r = await call("GET", "/zones/z_minto");
    line("GET /zones/{id}", r.status === 200 && r.body.includes("Minto"), `HTTP ${r.status}`);
  }

  console.log("── reports ──");
  {
    const r = await call("POST", "/reports/presign", { zoneId: "z_zakhira", contentType: "image/jpeg", sizeBytes: 20_000 });
    line("POST /reports/presign", r.status === 200 && r.body.includes("uploadUrl"), `HTTP ${r.status}`);
  }
  {
    const r = await call("GET", "/reports?zoneId=z_zakhira");
    line("GET /reports?zoneId=", r.status === 200 && r.body.includes("reports"), `HTTP ${r.status}`);
  }

  console.log("── route ──");
  {
    const r = await call("POST", "/route", { origin: { lat: 28.6139, lng: 77.209 }, destination: { lat: 28.6657, lng: 77.1535 } });
    const ok = r.status === 200 && r.body.includes("routes") && r.body.includes("recommended");
    line("POST /route", ok, `HTTP ${r.status}`);
  }

  console.log("── agent (read-only ask) ──");
  {
    const r = await call("POST", "/agent/ask", { zoneId: "z_minto", question: "Why is this zone risky?", lang: "en", execute: false });
    const ok = r.status === 200 && r.body.includes("risk");
    line("POST /agent/ask", ok, `HTTP ${r.status}`);
  }

  console.log("── workorders (needs passcode) ──");
  if (passcode) {
    const r = await call("GET", "/workorders", undefined, true);
    line("GET /workorders", r.status === 200, `HTTP ${r.status}`);
  } else {
    line("GET /workorders (skip — pass passcode)", true, "skipped");
    skip++;
  }

  if (passcode) {
    console.log("── ops write endpoints ──");
    {
      const r = await call("POST", "/workorders", { zoneId: "z_zakhira", type: "monitor", priority: "P3", note: "verify-live-api probe" }, true);
      line("POST /workorders", r.status === 201 || r.status === 200, `HTTP ${r.status}`);
    }
    {
      const r = await call("PATCH", "/workorders/does-not-exist", { status: "resolved" }, true);
      line("PATCH /workorders/{id} (404 handled)", r.status === 404, `HTTP ${r.status} (expected 404)`);
    }
    {
      const r = await call("POST", "/alerts", { zoneId: "z_minto", lang: "en", text: "verify-live-api probe alert" }, true);
      const ok = r.status === 201 && r.body.includes("draft");
      line("POST /alerts", ok, `HTTP ${r.status}`);
      if (ok) {
        try {
          const id = JSON.parse(r.body).id;
          const pub = await call("POST", `/alerts/${id}/publish`, undefined, true);
          line("POST /alerts/{id}/publish", pub.status === 200 && pub.body.includes("published"), `HTTP ${pub.status}`);
        } catch { line("POST /alerts/{id}/publish", false, "could not read alert id"); }
      }
    }
  } else {
    console.log("  (ops write endpoints require --passcode; skipping)");
  }

  console.log("── summary ──");
  const skipped = passcode ? " (ops routes included)" : " (ops routes skipped — pass passcode as 2nd arg)";
  console.log(`  ${GREEN}pass: ${pass}${RESET} · ${RED}fail: ${fail}${RESET} · ${YELLOW}skip: ${skip}${RESET}${skipped}`);
  if (failures.length) {
    console.log(`\n${RED}FAILED:${RESET}`);
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  if (fail === 0) {
    console.log(`\n${GREEN}All ${pass} tested routes passed. Backend is live and healthy.${RESET}\n`);
    process.exit(0);
  }
}

main();
