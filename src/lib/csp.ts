// One policy for document requests. Development exceptions disappear at build time.
export function contentSecurityPolicy(nonce: string, development: boolean, origin: string) {
  const websocket = new URL(origin);
  websocket.protocol = websocket.protocol === "https:" ? "wss:" : "ws:";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "frame-src 'self'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // Nonce and unsafe-inline cannot coexist: CSP ignores unsafe-inline in that case.
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`} https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    `connect-src 'self'${development ? ` ${websocket.origin}` : ""}`,
  ].join("; ");
}
