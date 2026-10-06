import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "@/lib/csp";
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/internal/login") {
    return NextResponse.redirect(new URL("/login", request.url));
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
