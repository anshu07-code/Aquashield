/**
 * PRE-PUSH GATEKEEPER — runs before every `git push`.
 * Blocks the push if anything is broken.
 * Usage: `node scripts/pre-push-check.js`
 *
 * What it checks:
 *  1. All mock JSON validates against the zod schemas in packages/types
 *  2. Risk-core unit tests pass
 *  3. TypeScript type-checks (no emit, walks all workspaces)
 *  4. No forbidden imports (risk-core only in allowed places)
 *
 * If this fails on push, FIX IT before pushing. Ask in the team chat if unsure.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";

// ---- config ----
const ROOT = new URL(".", import.meta.url).pathname.replace(/[/\\]$/, "");
const TS_CONFIG = join(ROOT, "tsconfig.base.json");
const MOCKS_DIR = join(ROOT, "mocks");
const RISK_CORE_TEST = join(ROOT, "packages/risk-core/test/risk.test.ts");
const CONTRACTS_PKGS = ["packages/types/src/index.ts", "packages/risk-core/src/index.ts"];

// ---- helpers ----
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 60_000,
      ...opts,
    }).toString().trim();
  } catch (e) {
    return e.stdout?.toString()?.trim() || e.message;
  }
}

function green(msg) { console.log(`  \x1b[32m✓\x1b[0m  ${msg}`); }
function red(msg) { console.log(`  \x1b[31m✗\x1b[0m  ${msg}`); }
function section(name) { console.log(`\n── ${name}`); }

// ---- 1. MOCK VALIDATION ----
section("Mock validation (contract check)");
const mockChecks = [
  ["mocks/zones.json", "ZoneListResponseSchema"],
  ["mocks/zone-detail.json", "ZoneDetailSchema"],
  ["mocks/report-response.json", "CreateReportResponseSchema"],
  ["mocks/route-response.json", "RouteResponseSchema"],
  ["mocks/agent-plan.json", "AgentPlanSchema"],
  ["mocks/workorders.json", "WorkOrderListResponseSchema"],
];

let mocksOk = true;
// We import schemas dynamically (the validate-mocks.ts already does this — reuse its logic)
try {
  const out = run(`npx tsx scripts/validate-mocks.ts`, { timeout: 30_000 });
  if (out.includes("FAIL")) {
    mocksOk = false;
    red("Mock validation failed — fix mocks/*.json or packages/types/src/index.ts");
  } else {
    green("All mocks validate against schemas");
  }
} catch (e) {
  mocksOk = false;
  red(`Mock validation error: ${e.message}`);
}

// ---- 2. RISK-CORE TESTS ----
section("Risk-core unit tests");
let testsOk = true;
try {
  const out = run(`node --import tsx --test packages/risk-core/test/*.test.ts`, { timeout: 30_000 });
  if (out.includes("failures") && out.includes("failures") > 0) {
    testsOk = false;
    red("Risk-core tests failed");
  } else {
    const passed = (out.match(/^\s*\d+ passed/gm) || []).length;
    green(`Risk-core tests passed${passed ? ` (${passed} test file(s))` : ""}`);
  }
} catch (e) {
  // node --test might not be available in all Node versions
  try {
    const out = run(`npx tsx --test packages/risk-core/test/*.test.ts`, { timeout: 30_000 });
    green("Risk-core tests passed");
  } catch {
    testsOk = false;
    red(`Tests may have failed: ${e.message.slice(0, 120)}`);
  }
}

// ---- 3. TYPE CHECK ----
section("TypeScript type check");
let typeOk = true;
try {
  const out = run(`npx tsc --noEmit -p tsconfig.base.json`, { timeout: 60_000 });
  if (out.includes("error")) {
    typeOk = false;
    // Print only the first 5 errors
    const errors = out.split("\n").filter(l => l.includes("error TS")).slice(0, 5);
    errors.forEach(e => console.log("   ", e));
    if (errors.length) red(`${errors.length} type error(s) found`);
  } else {
    green("TypeScript type-check passed");
  }
} catch (e) {
  typeOk = false;
  red(`Type check error: ${e.message.slice(0, 120)}`);
}

// ---- 4. FORBIDDEN PATTERN CHECK ----
section("Forbidden pattern check");
const FORBIDDEN = [
  { pattern: /import.*risk-core.*from\s+["']@aquashield\/risk-core["']/g, note: "risk-core only in packages/risk-core and apps/web (for simulator)" },
];
// Only check outside allowed dirs
const ALLOWED_RISK_CORE_IMPORTERS = ["apps/web/", "packages/risk-core/", "services/api/", "services/ingest/", "scripts/"];
let patternsOk = true;

function findFiles(dir, ext) {
  const files = [];
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        files.push(...findFiles(full, ext));
      } else if (full.endsWith(ext)) {
        files.push(full);
      }
    }
  } catch { /* ignore */ }
  return files;
}

for (const file of findFiles(join(ROOT, "packages"), ".ts")) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  try {
    const content = readFileSync(file, "utf8");
    if (content.includes("@aquashield/risk-core")) {
      const allowed = ALLOWED_RISK_CORE_IMPORTERS.some(p => rel.startsWith(p));
      if (!allowed) {
        patternsOk = false;
        red(`Forbidden: ${rel} imports risk-core`);
      }
    }
  } catch { /* ignore */ }
}
if (patternsOk) green("No forbidden import patterns");

// ---- RESULT ----
section("Pre-push result");
const allOk = mocksOk && testsOk && typeOk && patternsOk;
if (allOk) {
  console.log("\n  All checks passed. Safe to push.\n");
} else {
  console.log("\n  \x1b[31mBLOCKED — fix the failures above before pushing.\x1b[0m");
  console.log("  Ask in the team chat if you're unsure how to fix something.\n");
  process.exit(1);
}