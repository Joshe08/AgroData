import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow all LAN devices to access the dev server (hotreload, etc.)
  allowedDevOrigins: [
    "192.168.137.60",
    "192.168.137.*",
    "192.168.101.10",
    "192.168.137.142",
    "192.168.1.*",
    "192.168.0.*",
    "10.0.*.*",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "openweathermap.org" },
    ],
  },
};

export default nextConfig;
