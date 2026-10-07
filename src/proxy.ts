import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/api/v1" || request.nextUrl.pathname.startsWith("/api/v1/")) {
    const headers = new Headers(request.headers);
    for (const name of ["x-hx-client-ip", "x-hx-proxy-time", "x-hx-proxy-signature"]) headers.delete(name);
    const key = process.env.PROXY_SIGNING_KEY || "";
    // Vercel overwrites this header at its ingress. Self-hosted forward headers are untrusted.
    const ip = process.env.VERCEL === "1"
      ? (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim()
      : process.env.APP_ENV === "development" ? "127.0.0.1" : "";
    if (/^[a-fA-F0-9]{64}$/.test(key) && isIP(ip)) {
      const stamp = Math.floor(Date.now() / 1000).toString();
      const uri = request.nextUrl.pathname + request.nextUrl.search;
      const signature = createHmac("sha256", Buffer.from(key, "hex"))
        .update([stamp, ip, request.method, uri].join("\n")).digest("hex");
      headers.set("x-hx-client-ip", ip);
      headers.set("x-hx-proxy-time", stamp);
      headers.set("x-hx-proxy-signature", signature);
    }
    return NextResponse.next({ request: { headers } });
  }
  if (request.nextUrl.pathname === "/notif") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  if (request.nextUrl.pathname === "/demo" || request.nextUrl.pathname.startsWith("/demo/")) {
    return new NextResponse(null, { status: 404 });
  }
  const dev = process.env.NODE_ENV === "development";
  const csp = contentSecurityPolicy(nonce, dev, request.nextUrl.origin);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}
export const config = {
  matcher: ["/api/v1/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
