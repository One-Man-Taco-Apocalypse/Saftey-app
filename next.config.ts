import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Links prefetch each page's shared static shell (recommended with cacheComponents)
  partialPrefetching: true,
  // Builds a small self-contained server in .next/standalone (used by the Dockerfile).
  output: "standalone",
};

export default nextConfig;
