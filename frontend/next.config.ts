import type { NextConfig } from "next";

const nextConfig = {
  eslint: {
    // Only run ESLint on specific directories during build
    dirs: ["pages", "utils", "components", "lib", "app", "hooks"],
    // Ignore ESLint errors during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during production builds (optional)
    // ignoreBuildErrors: true,
  },
};

export default nextConfig;
