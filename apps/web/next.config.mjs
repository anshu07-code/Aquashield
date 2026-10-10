/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@aquashield/types", "@aquashield/risk-core"],
  reactStrictMode: true,
  // Fix dual-lockfile workspace root confusion
  outputFileTracingRoot: "C:/Users/BIT/Downloads/jalrakshak/apps/web",
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
