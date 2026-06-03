import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure paths end with / for consistent relative resolution
  trailingSlash: true,
  // Disable image optimization for Electron
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
