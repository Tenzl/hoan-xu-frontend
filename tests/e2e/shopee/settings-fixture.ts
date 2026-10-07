import { expect, type Page } from "@playwright/test";

export async function settingsFixture(page: Page, options: { recent?: boolean; conflict?: boolean; failVerification?: boolean; rejectSave?: boolean; role?: string } = {}) {
  let recent = options.recent ?? true;
  const settings = { publisher: "123456789", version: "1:1", revision: 1, enabled: false, trackingVerified: false, schemaVerified: false, verifiedAt: null as string | null, priceScale: 100000, mode: "local", executablePath: "", profilePath: "private-data/chrome-profile", headless: false, remoteUrl: "http://127.0.0.1:9222" };
  const writes: { path: string; body: any }[] = [];
  let jobReads = 0;
  await page.route("**/api/v1/**", async route => {
    const r = route.request(), path = new URL(r.url()).pathname;
    let data: unknown = [];
    if (r.method() !== "GET") { expect(r.headers()["x-csrf-token"]).toBe("settings-csrf"); writes.push({ path, body: r.postData() ? r.postDataJSON() : null }); }
    if (path.endsWith("/me")) data = { id: "admin", role: options.role || "admin", name: "Admin", permissions: ["settings"], csrfToken: "settings-csrf", mustChangePassword: false, recentAuthentication: recent };
    if (path.endsWith("/config")) data = { brand: "Hoàn Xu", faq: [] };
    if (path.endsWith("/admin/settings")) data = { brand: "Hoàn Xu", faq: [], maxDisplayPercent: null };
    if (path.endsWith("/admin/affiliate-channels")) data = [{ id: "shopee", name: "Shopee", status: "not_configured", settings: {} }];
    if (path.endsWith("/auth/internal/reauth")) {
      if (r.postDataJSON().password !== "settings-password") { await route.fulfill({ status: 403, json: { error: { code: "INVALID_PASSWORD", message: "Mật khẩu không đúng." } } }); return; }
      recent = true; data = { verified: true };
    }
    if (path.endsWith("/admin/browser")) data = { publisher: settings.publisher, enabled: settings.enabled, trackingVerified: settings.trackingVerified, localAvailable: settings.mode === "local", remoteAvailable: settings.mode === "remote", browser: { browser: true, state: "authenticated", authenticated: true } };
    if (path.endsWith("/admin/browser/session-checks")) data = { browser: true, authenticated: true, state: "authenticated" };
    if (path.endsWith("/admin/browser/settings")) {
      if (r.method() === "PUT") {
        if (!recent) { await route.fulfill({ status: 403, json: { error: { code: "REAUTH_REQUIRED", message: "Vui lòng xác thực lại mật khẩu." } } }); return; }
        if (options.rejectSave) { await route.fulfill({ status: 500, json: { error: { code: "INTERNAL_ERROR", message: "Không xử lý được yêu cầu." } } }); return; }
        if (options.conflict || r.postDataJSON().version !== settings.version) { settings.version = "9:1"; await route.fulfill({ status: 409, json: { error: { code: "SHOPEE_SETTINGS_CONFLICT", message: "Cấu hình đã thay đổi ở nơi khác. Tải lại cấu hình trước khi lưu." } } }); return; }
        const next = r.postDataJSON();
        expect(next).not.toHaveProperty("trackingVerified"); expect(next).not.toHaveProperty("schemaVerified");
        const changed = next.publisher !== settings.publisher || next.mode !== settings.mode || next.priceScale !== settings.priceScale;
        Object.assign(settings, next); settings.revision++; settings.version = settings.revision + ":1";
        if (changed) { settings.trackingVerified = false; settings.schemaVerified = false; settings.enabled = false; settings.verifiedAt = null; }
      }
      data = settings;
    }
    if (path.endsWith("/admin/browser/verifications")) {
      expect(r.postDataJSON().version).toBe(settings.version);
      jobReads = 0;
      await route.fulfill({ status: 202, json: { data: { id: "11111111-1111-4111-8111-111111111111", status: "queued", stage: "queued", errorMessage: null }, meta: {} } }); return;
    }
    if (path.includes("/admin/browser/verifications/")) {
      jobReads++;
      if (jobReads >= 2 && !settings.trackingVerified && !options.failVerification) { settings.trackingVerified = true; settings.schemaVerified = true; settings.verifiedAt = new Date().toISOString(); settings.revision++; settings.version = settings.revision + ":1"; }
      data = { id: "11111111-1111-4111-8111-111111111111", status: jobReads < 2 ? "running" : options.failVerification ? "failed" : "succeeded", stage: jobReads < 2 ? "tracking" : "finished", errorMessage: options.failVerification ? "Phiên Shopee Affiliate chưa đăng nhập hoặc đã hết hạn." : null };
    }
    await route.fulfill({ json: { data, meta: {} } });
  });
  return { settings, writes };
}
