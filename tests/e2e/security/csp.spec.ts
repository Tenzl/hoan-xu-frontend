import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { openSidebar } from "../../helpers/sidebar";

const runtime = process.env.CSP_RUNTIME;
test.skip(!runtime, "Run with the isolated CSP config: npm run test:csp");
const development = runtime === "development";

test("document CSP, hydration, navigation and inline enforcement", async ({ page, request }) => {
  await page.addInitScript(() => {
    (window as any).cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as any).cspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
    });
  });
  const response = await page.goto("/link");
  const policy = response!.headers()["content-security-policy"];
  expect(policy).toBeTruthy();
  const directive = (name: string) => policy.split(";").map(value => value.trim()).find(value => value.startsWith(name + " "))!;
  const script = directive("script-src"), style = directive("style-src");
  expect(script).toContain("'strict-dynamic'");
  expect(script).not.toContain("'unsafe-inline'");
  expect(script.includes("'unsafe-eval'")).toBe(development);
  const nonce = script.match(/'nonce-([^']+)'/)![1];
  const spoofed = await request.get("/link", { headers: { "x-nonce": "client-forged", "Content-Security-Policy": "script-src 'unsafe-inline'" } });
  expect(spoofed.headers()["content-security-policy"]).not.toContain(`'nonce-${nonce}'`);
  expect(spoofed.headers()["content-security-policy"]).not.toContain("client-forged");
  expect(await spoofed.text()).not.toContain('nonce="client-forged"');
  await expect(page.getByRole("heading", { name: "Lấy link hoàn tiền", exact: true })).toBeVisible();
  const scripts = await page.locator('script:not([src]):not([type="application/json"]):not([type="application/ld+json"])').evaluateAll(elements => elements.filter(el => el.textContent?.trim()).map(el => (el as HTMLScriptElement).nonce));
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts).toEqual(scripts.map(() => nonce));
  if (development) {
    expect(style).toContain("'unsafe-inline'");
    expect(style).not.toContain("'nonce-");
    expect(directive("connect-src")).toContain(new URL(page.url()).origin.replace(/^http/, "ws"));
    expect(directive("connect-src")).not.toMatch(/(?:^|\s)wss?:\s|\*/ );
    await page.waitForFunction(() => document.querySelector("nextjs-portal")?.shadowRoot?.querySelector("style"));
  } else {
    expect(style).toContain(`'nonce-${nonce}'`);
    expect(style).not.toContain("'unsafe-inline'");
    expect(directive("connect-src")).toBe("connect-src 'self'");
  }
  // React controls work, CSS/font allowlists and transitions don't violate policy.
  await openSidebar(page);
  await page.locator('.side a[href="/help"]').click();
  await expect(page).toHaveURL(/\/help$/);
  await openSidebar(page);
  await page.locator('.side a[href="/link"]').click();
  await expect(page).toHaveURL(/\/link$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lấy link hoàn tiền", exact: true })).toBeVisible();
  await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toBeEditable();
  expect(await page.evaluate(() => (window as any).cspViolations)).toEqual([]);
  const activePolicy = (await request.get("/link")).headers()["content-security-policy"];
  expect(activePolicy).not.toContain(`'nonce-${nonce}'`);
  // Inject parser-inserted markup into the actual document response. Code
  // executed through DevTools/page.evaluate is privileged and cannot prove CSP.
  await page.route("**/link", async route => {
    const response = await route.fetch();
    const serverNonce = response.headers()["content-security-policy"].match(/'nonce-([^']+)'/)![1];
    const markup = `<script>window.untrustedScriptExecuted=true</script><style>body { --csp-untrusted: blocked; }</style><style nonce="${serverNonce}">body { --csp-trusted: allowed; }</style>`;
    await route.fulfill({ response, body: (await response.text()).replace("</head>", markup + "</head>") });
  }, { times: 1 });
  await page.reload();
  await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toBeEditable();
  await expect.poll(() => page.evaluate(() => (window as any).cspViolations.some((event: any) => event.directive === "script-src-elem" && event.blocked === "inline"))).toBeTruthy();
  expect(await page.evaluate(() => (window as any).untrustedScriptExecuted)).toBeUndefined();
  if (!development) {
    await expect.poll(() => page.evaluate(() => (window as any).cspViolations.some((event: any) => event.directive === "style-src-elem" && event.blocked === "inline"))).toBeTruthy();
    expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--csp-untrusted"))).toBe("");
    expect(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--csp-trusted").trim())).toBe("allowed");
  }

});

test("development HMR CSS remains allowed", async ({ page }, info) => {
  test.skip(!development || info.project.name !== "desktop", "One development-only HMR check");
  const violations: string[] = [];
  await page.addInitScript(() => {
    (window as any).styleViolations = [];
    document.addEventListener("securitypolicyviolation", event => {
      if (event.effectiveDirective.startsWith("style-src")) (window as any).styleViolations.push(event.blockedURI);
    });
  });
  let received = 0;
  page.on("websocket", socket => socket.on("framereceived", frame => {
    if (typeof frame.payload === "string" && /built|turbopack-message/.test(frame.payload)) received++;
  }));
  await page.goto("/link");
  await expect(page.getByLabel("Link sản phẩm Shopee", { exact: true })).toBeEditable();
  const css = process.env.E2E_WORKSPACE ? path.join(process.env.E2E_WORKSPACE, "src/styles/globals.css") : path.resolve(__dirname, "../../../src/styles/globals.css");
  const original = fs.statSync(css);
  const marker = `\n/* CSP HMR test ${crypto.randomUUID()} */\n`;
  const before = received;
  try {
    fs.appendFileSync(css, marker);
    await expect.poll(() => received, { timeout: 15000 }).toBeGreaterThan(before);
    violations.push(...await page.evaluate(() => (window as any).styleViolations));
    expect(violations).toEqual([]);
  } finally {
    fs.writeFileSync(css, fs.readFileSync(css, "utf8").replace(marker, ""));
    fs.utimesSync(css, original.atime, original.mtime);
  }
});
