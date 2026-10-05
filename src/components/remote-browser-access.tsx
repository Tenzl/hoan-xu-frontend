"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function RemoteBrowserAccess({ local = false }: { local?: boolean }) {
  const client = useQueryClient();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [opened, setOpened] = useState(false);

  async function open() {
    // Open within the user gesture so async authentication does not trigger the
    // popup blocker. The remote display uses its own short-lived session.
    const popup = local ? null : window.open("about:blank", "_blank");
    if (!local && !popup) {
      setFailure(t("Cho phép mở cửa sổ mới để dùng Chrome trên server."));
      return;
    }
    if (popup) popup.opener = null;
    setBusy(true);
    setFailure("");
    setOpened(false);
    try {
      await api("/auth/internal/reauth", "POST", { password });
      setPassword("");
      const access = await api<{ url?: string; local?: boolean; expiresAt?: string }>("/admin/browser/access", "POST");
      if (local) {
        if (!access.local) throw new Error(t("Địa chỉ Chrome từ xa không hợp lệ."));
      } else {
      const url = new URL(access.url || "");
      if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
        throw new Error(t("Địa chỉ Chrome từ xa không hợp lệ."));
      }
      popup?.location.replace(url.href);
      }
      await client.invalidateQueries({ queryKey: ["/admin/browser"] });
      setOpened(true);
    } catch (error) {
      popup?.close();
      setFailure((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={event => { event.preventDefault(); void open(); }}>
      <p className="small mute">{t(local ? "Chrome sẽ mở trên máy đang chạy backend. Đăng nhập Shopee trong cửa sổ Chrome, rồi quay lại kiểm tra phiên." : "Chrome chạy trên server. Đăng nhập hoặc xác minh Shopee trong cửa sổ mới, sau đó kiểm tra lại phiên tại đây.")}</p>
      <label className="field" htmlFor="remote-browser-password">{t("Xác nhận mật khẩu quản trị")}</label>
      <input id="remote-browser-password" className="inp" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} maxLength={128} required disabled={busy} />
      <div><button className="btn" type="submit" disabled={busy || !password}>{busy ? t("Đang mở Chrome…") : t(local ? "Mở Chrome trên máy này" : "Mở Chrome trên server")}</button></div>
      {failure && <p className="err" role="alert">{failure}</p>}
      {opened && <p role="status">{t(local ? "Đã mở Chrome trên máy chạy backend. Đăng nhập Shopee, sau đó quay lại kiểm tra phiên." : "Đã mở Chrome. Đăng nhập Shopee trong cửa sổ mới, sau đó quay lại kiểm tra phiên. Phiên điều khiển hết hạn sau 10 phút.")}</p>}
    </form>
  );
}
