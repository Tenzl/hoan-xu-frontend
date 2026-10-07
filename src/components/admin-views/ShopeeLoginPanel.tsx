"use client";
import { api } from "@/lib/api";
import { checkerErrorMessage } from "@/lib/checker-errors";
import { useI18n } from "@/lib/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { AppContext } from "../app-context";
import { RemoteBrowserAccess } from "../remote-browser-access";
import { Card, type Data } from "../ui";
export function ShopeeLoginPanel({ publisher, status, error, remoteAvailable, localAvailable }: {
    ctx: AppContext;
    publisher: string;
    status?: Data;
    error: Error | null;
    remoteAvailable?: boolean;
    localAvailable?: boolean;
}) {
    const { t } = useI18n();
    const client = useQueryClient();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [failure, setFailure] = useState("");
    const states: Record<string, string> = {
        not_started: "Chưa mở Chrome",
        checking: "Đang kiểm tra phiên…",
        authenticated: "Đã đăng nhập",
        login_required: "Cần đăng nhập lại",
        verification_required: "Shopee yêu cầu xác minh truy cập",
        unavailable: "Chromium hoặc Shopee chưa sẵn sàng",
    };
    async function checkSession() {
        setBusy(true);
        setFailure("");
        setMessage("");
        try {
            const result = await api<Data>("/admin/browser/session-checks", "POST");
            setMessage(result.authenticated
                ? "Đã đăng nhập Shopee. Backend đang dùng phiên Chrome này để kiểm tra sản phẩm."
                : result.state === "verification_required"
                    ? "Shopee yêu cầu xác minh. Mở Chrome trên server để hoàn tất, sau đó kiểm tra phiên lại."
                    : "Chưa đăng nhập Shopee. Mở Chrome trên server và đăng nhập trước khi kiểm tra phiên.");
            await client.invalidateQueries({ queryKey: ["/admin/browser"] });
        }
        catch (e) {
            setFailure((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <Card title={t("Đăng nhập Shopee")}>
    <div className="stack">
      {remoteAvailable || localAvailable ? <RemoteBrowserAccess local={!remoteAvailable}/> : <p className="small mute">{t("Quản trị viên cần bật Chrome từ xa trên backend để đăng nhập Shopee tại đây.")}</p>}
      <p>{t("Chromium")}: {status?.browser ? t("Đang chạy") : t("Chưa mở Chrome")} · {t("Phiên")}: {t(states[status?.state] || (status?.authenticated ? "Đã đăng nhập" : "Chưa xác minh"))}</p>
      <p className="small mute">{t("Sau khi đăng nhập trong Chrome trên server, quay lại đây và kiểm tra phiên. Backend dùng trực tiếp phiên Chrome đang chạy.")}</p>
      <p className="small mute">{t("Không có disk giữ profile, bạn cần đăng nhập lại sau khi backend restart.")}</p>
      <div><button className="btn ghost" type="button" disabled={busy || !status?.browser} onClick={() => void checkSession()}>{busy ? t("Đang kiểm tra phiên…") : t("Tôi đã đăng nhập — Kiểm tra phiên")}</button></div>
      {(failure || error) && <p className="err" role="alert">{t(failure || error?.message || "")}</p>}
      {message && <p role="status">{t(message)}</p>}
      {status?.lastFailure && <p className="small err" role="status">{t("Lỗi checker gần nhất")}: {t(checkerErrorMessage(status.lastFailure.code, status.lastFailure.code))} · {status.lastFailure.code} · {status.lastFailure.phase} · {new Date(status.lastFailure.at).toLocaleString()}</p>}
      <p className="small mute">{t("Affiliate ID (Shopee Publisher)")}: {publisher || t("Chưa cấu hình")}</p>
    </div>
  </Card>;
}
