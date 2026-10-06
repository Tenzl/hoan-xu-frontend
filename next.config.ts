import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async redirects() {
    return [{ source: "/checkin", destination: "/", permanent: true }];
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.BACKEND_URL || "http://127.0.0.1:8080"}/api/v1/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};
export default config;
