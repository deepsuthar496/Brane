import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Electron production builds
  output: process.env.ELECTRON_BUILD === "true" ? "export" : undefined,
  // Disable image optimization for Electron (no server)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
