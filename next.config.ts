import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    // Allow preview panel and sandbox gateway origins
    '.space-z.ai',
    'localhost',
  ],
};

export default nextConfig;
