// FILE: next.config.ts
// Purpose: Configures Next.js features used by the Rank Atlas UI.
// Layer: Framework config
// Exports: nextConfig
// Depends on: remote Apple artwork images

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.mzstatic.com",
      },
    ],
  },
};

export default nextConfig;
