/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@aquashield/types", "@aquashield/risk-core"],
  reactStrictMode: true,
};

export default nextConfig;
