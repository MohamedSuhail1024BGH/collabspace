import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "10.249.244.39",
    "10.249.244.39:3000",
    "10.*.*.*",
    "192.168.*.*",
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "*.loca.lt",
    "*.ngrok-free.app",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "10.249.244.39",
        "10.249.244.39:3000",
        "10.*.*.*",
        "192.168.*.*",
        "localhost",
        "localhost:3000",
        "127.0.0.1",
        "127.0.0.1:3000",
        "*.loca.lt",
        "*.ngrok-free.app",
      ],
    },
  },
};

export default nextConfig;