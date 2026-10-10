/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@aquashield/types", "@aquashield/risk-core"],
  reactStrictMode: true,
  // Fix dual-lockfile workspace root confusion
  outputFileTracingRoot: "C:/Users/BIT/Downloads/jalrakshak/apps/web",
};

export default nextConfig;
