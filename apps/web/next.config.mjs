import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Stably point tracing at the real project dir, resolving the "workspace root from
 * the user's home" confusion (dual-lockfile). Previously hardcoded to a Windows
 * path, which broke the Amplify/Linux build — now derived from this file's location.
 */
const projectDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@aquashield/types", "@aquashield/risk-core"],
  reactStrictMode: true,
  // Static export → `next build` emits a plain `out/` folder that Amplify/any static
  // host serves directly (no SSR manifest needed). The app calls the API from the
  // browser, so this works fully with NEXT_PUBLIC_* baked in at build time.
  output: "export",
  // Fix dual-lockfile workspace root confusion (portable across OSes)
  outputFileTracingRoot: projectDir,
  // Never let the browser/cache serve a stale HTML page (was s-maxage=31536000 → old UI on refresh)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
