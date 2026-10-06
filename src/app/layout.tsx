import type { Metadata } from "next";
import { headers } from "next/headers";
import "../styles/globals.css";
import "../styles/dashboard-history.css";
import { Providers } from "@/components/providers";
export const metadata: Metadata = {
  title: "Hoàn Xu — Mua sắm và nhận hoàn tiền",
  description: "Theo dõi hoàn tiền, điểm danh và đổi quà cùng Hoàn Xu.",
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  // Request-bound rendering is required for fresh CSP nonces (including Next's scripts).
  await headers();
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
