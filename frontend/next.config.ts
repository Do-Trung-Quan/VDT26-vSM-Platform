import type { NextConfig } from "next";

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Proxy API calls → NestJS backend
      {
        source: "/api/:path*",
        destination: `${API_ORIGIN}/api/:path*`,
      },
      // Proxy MinIO avatar/audio assets (URL từ DB có dạng /mp2-bucket/...)
      {
        source: "/mp2-bucket/:path*",
        destination: "http://localhost:9000/mp2-bucket/:path*",
      },
    ];
  },
};

export default nextConfig;
