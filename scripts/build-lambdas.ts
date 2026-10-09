/**
 * Bundle every Lambda handler into a single self-contained JS file with esbuild.
 *
 *   npm run build:lambdas
 *
 * Output: services/api/dist/*.js and services/ingest/dist/*.js — these are what
 * infra/template.yaml points at (Handler: dist/<name>.handler). `sam build` then
 * just copies CodeUri, so deploy never depends on SAM's own build toolchain.
 */
import { build } from "esbuild";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rmSync, mkdirSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  { service: "api", entry: "src/zones/handler.ts", out: "zones" },
  { service: "api", entry: "src/reports/handler.ts", out: "reports" },
  { service: "api", entry: "src/route/handler.ts", out: "route" },
  { service: "api", entry: "src/ops/handler.ts", out: "ops" },
  { service: "api", entry: "src/agent/handler.ts", out: "agent" },
  { service: "ingest", entry: "src/handler.ts", out: "ingest" },
];

void (async () => {
  for (const t of targets) {
    const serviceDir = join(root, "services", t.service);
    const outdir = join(serviceDir, "dist");
    rmSync(outdir, { recursive: true, force: true });
    mkdirSync(outdir, { recursive: true });

    await build({
      entryPoints: [join(serviceDir, t.entry)],
      outfile: join(outdir, `${t.out}.js`),
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      sourcemap: false,
      minify: false,
      logLevel: "info",
      absWorkingDir: root,
    });
    console.log(`built: services/${t.service}/dist/${t.out}.js`);
  }
  console.log("All Lambda bundles built.");
})();
