"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";
import type { AppContext } from "./hoanxu";
import { AdminUnsavedChanges } from "./admin-views/admin-ui";
import { Card } from "./ui";

type Settings = components["schemas"]["ShopeeSettings"];
type Input = components["schemas"]["ShopeeSettingsInput"];
type Verification = components["schemas"]["ShopeeVerification"];
function input(s: Settings): Input { return { publisher: s.publisher, version: s.version, enabled: s.enabled, priceScale: s.priceScale, mode: s.mode, executablePath: s.executablePath, profilePath: s.profilePath, headless: false, remoteUrl: s.remoteUrl }; }
function connection(s: Input) { return JSON.stringify([s.publisher.trim(), s.priceScale, s.mode, s.mode === "local" ? [s.executablePath, s.profilePath] : s.remoteUrl]); }

export function ShopeeSettings({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const query = useQuery<Settings>({ queryKey: ["/admin/browser/settings"], queryFn: () => api("/admin/browser/settings"), enabled: ctx.me?.role === "admin", refetchInterval: 5000 });
  if (ctx.me?.role !== "admin") return null;
  return <div role="region" aria-label={t("Kết nối Shopee")}><Card title={t("Kết nối Shopee")}>
    {query.error && <p className="err" role="alert">{t(query.error.message)}</p>}
    {query.data?.mode ? <SettingsForm settings={query.data} ctx={ctx} /> : !query.error && <p>{t("Đang tải…")}</p>}
  </Card></div>;
}

function SettingsForm({ settings, ctx }: { settings: Settings; ctx: AppContext }) {
  const { t } = useI18n();
  const client = useQueryClient();
  const [base, setBase] = useState(settings);
  const [value, setValue] = useState(() => input(settings));
  const [password, setPassword] = useState("");
  const [reauthNeeded, setReauthNeeded] = useState(!ctx.me?.recentAuthentication);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState(false);
  const [sample, setSample] = useState("");
  const [job, setJob] = useState<Verification | null>(null);
  const dirty = JSON.stringify(value) !== JSON.stringify(input(base));
  const externalChange = settings.version !== base.version;
  const changedConnection = connection(value) !== connection(input(base));
  const verified = base.trackingVerified && base.schemaVerified && !changedConnection && !externalChange;
  const jobActive = job?.status === "queued" || job?.status === "running";
  useEffect(() => {
    if (!dirty && settings.version !== base.version) { setBase(settings); setValue(input(settings)); }
  }, [settings, dirty, base.version]);
  const verification = useQuery<Verification>({ queryKey: ["/admin/browser/verifications", job?.id], queryFn: () => api("/admin/browser/verifications/" + job!.id), enabled: !!jobActive, refetchInterval: jobActive ? 1500 : false, retry: false });
  useEffect(() => {
    if (!verification.data) return;
    setJob(verification.data);
    if (["succeeded", "failed", "cancelled"].includes(verification.data.status)) {
      void client.invalidateQueries({ queryKey: ["/admin/browser/settings"] });
      void client.invalidateQueries({ queryKey: ["/admin/browser"] });
    }
  }, [verification.data, client]);
  function change<K extends keyof Input>(key: K, next: Input[K]) {
    setValue(old => { const candidate = { ...old, [key]: next }; if (key !== "enabled" && connection(candidate) !== connection(input(base))) candidate.enabled = false; return candidate; });
    setSaved(false); setFailure("");
  }
  async function authenticated<T>(action: () => Promise<T>): Promise<T> {
    if (reauthNeeded) {
      if (!password) throw new Error(t("Nhập mật khẩu quản trị để xác thực lại."));
      await api("/auth/internal/reauth", "POST", { password });
      setPassword(""); setReauthNeeded(false);
    }
    return action();
  }
  function fail(error: unknown) {
    if (error instanceof ApiError && error.code === "REAUTH_REQUIRED") setReauthNeeded(true);
    setFailure((error as Error).message);
  }
  async function save() {
    if (busy || !dirty) return;
    setBusy(true); setFailure(""); setSaved(false);
    try {
      const result = await authenticated(() => api<Settings>("/admin/browser/settings", "PUT", value));
      setBase(result); setValue(input(result)); setSaved(true);
      client.setQueryData(["/admin/browser/settings"], result);
      await client.invalidateQueries({ queryKey: ["/admin/browser"] });
      await client.invalidateQueries({ queryKey: ["/affiliate-channels"] });
      await client.invalidateQueries({ queryKey: ["/admin/affiliate-channels"] });
    } catch (error) { fail(error); if (error instanceof ApiError && error.code === "SHOPEE_SETTINGS_CONFLICT") await client.invalidateQueries({ queryKey: ["/admin/browser/settings"] }); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (busy || dirty || jobActive) return;
    setBusy(true); setFailure("");
    try { const result = await authenticated(() => api<Verification>("/admin/browser/verifications", "POST", { version: base.version, productUrl: sample.trim() })); setJob(result); }
    catch (error) { fail(error); }
    finally { setBusy(false); }
  }
  const stageLabels: Record<string, string> = { queued: "Đang chờ kiểm tra…", running: "Đang kiểm tra…", session: "Đang kiểm tra phiên Shopee…", product: "Đang kiểm tra dữ liệu sản phẩm…", tracking: "Đang kiểm tra tracking qua GQL Shopee…" };
  return <form className="stack" onSubmit={event => { event.preventDefault(); void save(); }}>
    <AdminUnsavedChanges dirty={dirty && !busy}/>
    <p className="small mute">{t("Nhập và lưu cấu hình một lần, mở Chrome đăng nhập, rồi kiểm tra sản phẩm và tracking trước khi bật tạo link.")}</p>
    <p className="small mute">{t("Affiliate ID dùng chung cho tài khoản affiliate. Cấu hình Chrome và bật/tắt riêng cho địa chỉ ứng dụng đang dùng. SSH/noVNC giữ cấu hình triển khai.")}</p>
    {externalChange && dirty && <div role="alert" className="stack"><p className="err">{t("Cấu hình đã thay đổi ở nơi khác. Bản nháp của bạn vẫn được giữ.")}</p><div><button className="btn ghost" type="button" disabled={busy} onClick={() => { setBase(settings); setValue(input(settings)); setFailure(""); setSaved(false); }}>{t("Bỏ bản nháp — Tải cấu hình mới")}</button></div></div>}
    <fieldset className="stack" disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <label className="field">{t("Affiliate ID (Shopee Publisher)")}<input className="inp" value={value.publisher} inputMode="numeric" pattern="[0-9]*" maxLength={32} autoComplete="off" onChange={event => change("publisher", event.target.value)} /></label>
      <label className="field">{t("Chế độ Chrome")}<select className="inp" aria-label={t("Chế độ Chrome")} value={value.mode} onChange={event => change("mode", event.target.value as Input["mode"])}><option value="local">{t("Chrome trên máy chạy backend")}</option><option value="remote">{t("Chrome từ xa qua SSH tunnel")}</option></select></label>
      <details><summary>{t("Nâng cao")}</summary><div className="stack" style={{ marginTop: 12 }}>
        {value.mode === "local" ? <>
          <label className="field">{t("Đường dẫn Chrome (để trống để tự tìm)")}<input className="inp" value={value.executablePath} maxLength={1024} onChange={event => change("executablePath", event.target.value)} /></label>
          <label className="field">{t("Thư mục profile Chrome")}<input className="inp" required value={value.profilePath} maxLength={1024} onChange={event => change("profilePath", event.target.value)} /></label>
        </> : <label className="field">{t("Địa chỉ Chrome từ xa (loopback)")}<input className="inp" type="url" required value={value.remoteUrl} onChange={event => change("remoteUrl", event.target.value)} /></label>}
        <label className="field">{t("Hệ số đơn vị giá Shopee")}<input className="inp" type="number" min={1} max={1000000000} step={1} required value={value.priceScale} onChange={event => change("priceScale", Number(event.target.value))} /></label>
        <p className="small mute">{t("Giá Shopee được chia cho hệ số này để ra VND. Giá trị đã kiểm chứng hiện tại: 100000.")}</p>
        <p className="small mute">{t("Chrome luôn có cửa sổ để đăng nhập. Đổi kết nối hoặc profile sẽ đóng phiên Chrome hiện tại; mở lại ở phần đăng nhập.")}</p>
      </div></details>
      <p role="status">{t("Dữ liệu sản phẩm")}: {t(verified ? "Đã kiểm chứng" : "Cần kiểm tra")} · {t("Tracking và Sub_id")}: {t(verified ? "Đã kiểm chứng" : "Cần kiểm tra")}</p>
      <label className="row"><input type="checkbox" checked={value.enabled} disabled={!value.enabled && (!verified || externalChange)} onChange={event => change("enabled", event.target.checked)} />{t("Cho phép khách tạo link")}</label>
      {!verified && <p className="small mute">{t("Lưu cấu hình và kiểm tra thành công trước khi bật. Đổi Affiliate ID, kết nối Chrome hoặc hệ số giá sẽ yêu cầu kiểm tra lại.")}</p>}
      {reauthNeeded && <label className="field">{t("Xác nhận mật khẩu quản trị để lưu hoặc kiểm tra")}<input className="inp" type="password" autoComplete="current-password" maxLength={128} value={password} onChange={event => setPassword(event.target.value)} /></label>}
      <div className="row between"><button className="btn" disabled={busy || !dirty}>{busy ? t("Đang lưu…") : t("Lưu cấu hình")}</button><span className="small mute" role="status">{t(dirty ? "Có thay đổi chưa lưu" : saved ? "Đã lưu và áp dụng cấu hình." : "Cấu hình đã lưu")}</span></div>
    </fieldset>
    {failure && <p className="err" role="alert">{t(failure)}</p>}
    <div className="stack">
      <label className="field">{t("Link sản phẩm để kiểm tra")}<input className="inp" type="url" placeholder="https://shopee.vn/product/.../..." value={sample} disabled={busy || !!jobActive} onChange={event => setSample(event.target.value)} /></label>
      <div><button className="btn ghost" type="button" disabled={busy || dirty || externalChange || !!jobActive || !sample.trim() || !base.publisher} onClick={() => void verify()}>{t("Kiểm tra sản phẩm và tracking")}</button></div>
      {dirty && <p className="small mute">{t("Lưu các thay đổi trước khi kiểm tra.")}</p>}
      {jobActive && <p role="status">{t(stageLabels[job?.stage || "queued"] || "Đang kiểm tra…")}</p>}
      {job?.status === "succeeded" && verified && <p className="pill ok" role="status">{t("Đã kiểm chứng dữ liệu và tracking. Bạn có thể bật tạo link.")}</p>}
      {(job?.status === "failed" || job?.status === "cancelled") && <p className="err" role="alert">{t(job.errorMessage || "Kiểm tra Shopee chưa thành công.")}</p>}
      {verification.error && <p className="err" role="alert">{t(verification.error.message)}</p>}
      <p className="small mute">{t("Kiểm tra dùng link chẩn đoán riêng, không tạo link khách hàng, đơn hoặc giao dịch ví. Tác vụ tối đa 90 giây.")}</p>
    </div>
  </form>;
}
