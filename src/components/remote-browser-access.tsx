"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function RemoteBrowserAccess() {
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [opened, setOpened] = useState(false);

  async function open() {
    // Open within the user gesture so async authentication does not trigger the
    // popup blocker. The remote display uses its own short-lived session.
    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      setFailure(t("Cho phép mở cửa sổ mới để dùng Chrome trên server."));
      return;
    }
    popup.opener = null;
    setBusy(true);
    setFailure("");
    setOpened(false);
    try {
      await api("/auth/internal/reauth", "POST", { password });
      setPassword("");
      const access = await api<{ url: string; expiresAt: string }>("/admin/browser/access", "POST");
      const url = new URL(access.url);
      if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
        throw new Error(t("Địa chỉ Chrome từ xa không hợp lệ."));
      }
      popup.location.replace(url.href);
      setOpened(true);
    } catch (error) {
      popup.close();
      setFailure((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={event => { event.preventDefault(); void open(); }}>
      <p className="small mute">{t("Chrome chạy trên server. Đăng nhập hoặc xác minh Shopee trong cửa sổ mới, sau đó kiểm tra lại phiên tại đây.")}</p>
      <label className="field" htmlFor="remote-browser-password">{t("Xác nhận mật khẩu quản trị")}</label>
      <input id="remote-browser-password" className="inp" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} maxLength={128} required disabled={busy} />
      <div><button className="btn" type="submit" disabled={busy || !password}>{busy ? t("Đang mở Chrome…") : t("Mở Chrome trên server")}</button></div>
      {failure && <p className="err" role="alert">{failure}</p>}
      {opened && <p role="status">{t("Đã mở Chrome. Phiên điều khiển hết hạn sau 10 phút; phiên Shopee được lưu trên server.")}</p>}
    </form>
  );
}
