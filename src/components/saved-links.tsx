"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, Copy, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { tierName } from "@/lib/cashback";
import { linkExpired, useLinkClock } from "@/lib/link-expiry";
import type { AppContext } from "./hoanxu";
import { Card, Modal, type Data } from "./ui";
const labels: Record<string, string> = { active: "Còn hạn", progress: "Đang xử lý", completed: "Hoàn thành", cancelled: "Đã cancel", legacy: "Link lịch sử — chỉ đọc" };
export function LinkDeadline({ link }: {
    link: Data;
}) {
    const { t, language } = useI18n();
    const now = useLinkClock(link.expiresAt);
    if (link.legacy)
        return <p className="small mute">{t(labels.legacy)}</p>;
    const remaining = Date.parse(link.expiresAt || "") - now;
    const expired = !Number.isFinite(remaining) || remaining <= 0;
    const status = link.status || "active";
    const cancelled = status === "cancelled" || (expired && status === "active");
    let countdown = "";
    if (!expired) {
        if (remaining >= 86400000)
            countdown = `${t("Còn")} ${Math.ceil(remaining / 86400000)} ${t("ngày để được hoàn Xu")}`;
        else {
            const minutes = Math.ceil(remaining / 60000);
            countdown = `${t("Còn")} ${Math.floor(minutes / 60)} ${t("giờ")} ${minutes % 60} ${t("phút để được hoàn Xu")}`;
        }
    }
    return <>
  {cancelled ? <p className="small err">{t(expired ? "Link đã bị cancel — hết thời hạn hoàn Xu" : "Link đã bị cancel — đơn đã bị hủy hoặc từ chối")}</p> : <p className="small">{t(labels[status] || labels.active)}{countdown && ` · ${countdown}`}</p>}
  {(status === "progress" || status === "completed") && expired && <p className="small mute">{t("Hạn mua mới đã hết; đơn đặt đúng hạn tiếp tục được đối soát.")}</p>}
  <p className="small">{t("Hạn hoàn Xu")}: {new Date(link.expiresAt).toLocaleString(language === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} (GMT+7)</p>
 </>;
}
export function SavedLink({ link, ctx, onDeleted, result = false }: {
    link: Data;
    ctx: AppContext;
    onDeleted?: (id: string) => void;
    result?: boolean;
}) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const detail = useQuery<Data>({ queryKey: [`/affiliate-links/${link.id}`], queryFn: () => api<Data>(`/affiliate-links/${link.id}`), enabled: result && Boolean(link.id) && !link.legacy, refetchInterval: 30000, retry: false });
    const current = detail.data && detail.data.id === link.id ? detail.data : link;
    const now = useLinkClock(current.expiresAt);
    const expired = linkExpired(current.expiresAt, now);
    const locked = current.legacy || !current.canDelete || current.status === "progress" || current.status === "completed";
    useEffect(() => { setCopied(false); }, [link.trackingCode]);
    async function remove() {
        if (busy || locked)
            return;
        setBusy(true);
        setError("");
        try {
            await ctx.act(`/affiliate-links/${current.id}`, "DELETE");
            setConfirm(false);
            onDeleted?.(current.id);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setBusy(false);
        }
    }
    return <article className={result ? "out composer-result" : "out saved-link"} data-link-id={current.id} role={result ? "region" : undefined} aria-label={result ? t("Link của bạn đã sẵn sàng") : undefined} aria-live={result ? "polite" : undefined}>
  {result && <div className="composer-result-heading"><span aria-hidden="true"><Check size={17}/></span><h3>{t("Link của bạn đã sẵn sàng")}</h3></div>}
  <code tabIndex={0} aria-label={t("Link hoàn tiền")}>{current.affiliateUrl}</code>
  <LinkDeadline link={current}/>
  <p className="small mute">{t("Hạng áp dụng cho link")} · {t(tierName(current.tierCode))}{current.payoutFactor && ` · ${t("Hệ số hoàn Xu")}: ${current.payoutFactor}`}</p>
  <div className="composer-result-actions">
   <button type="button" className="btn sm" disabled={expired || current.legacy} onClick={async () => { if (linkExpired(current.expiresAt) || current.legacy)
        return; try {
        await navigator.clipboard.writeText(current.affiliateUrl);
        setCopied(true);
        ctx.notify(t("Đã sao chép"));
    }
    catch {
        ctx.notify(t("Chọn link để sao chép thủ công"));
    } }}><Copy size={15}/>{t(copied ? "Đã sao chép" : "Sao chép")}</button>
   <a className="btn sm ghost" aria-disabled={expired || current.legacy} tabIndex={expired || current.legacy ? -1 : undefined} href={expired || current.legacy ? undefined : current.affiliateUrl} onClick={event => { if (linkExpired(current.expiresAt) || current.legacy)
        event.preventDefault(); }} target="_blank" rel="noopener noreferrer">{t("Mở để mua")}<ArrowUpRight size={15}/></a>
   {current.id && <button type="button" className="btn sm ghost" disabled={locked || busy} title={locked ? t(current.legacy ? labels.legacy : "Link đang xử lý hoặc hoàn thành, không được xóa.") : undefined} onClick={() => setConfirm(true)}><Trash2 size={15}/>{t("Xóa link")}</button>}
  </div>
  {confirm && <Modal title="Xóa link" onClose={() => { if (!busy)
        setConfirm(false); }}><p>{t("Xóa thật bản ghi link khỏi database. Đơn đặt đúng hạn vẫn được ghi nhận qua báo cáo Shopee, kể cả sau khi xóa link.")}</p>{error && <p role="alert" className="err">{error}</p>}<div className="row wrap"><button className="btn ghost" disabled={busy} onClick={() => setConfirm(false)}>{t("Giữ link")}</button><button className="btn" disabled={busy} onClick={() => void remove()}>{t(busy ? "Đang xóa…" : "Xóa khỏi database")}</button></div></Modal>}
 </article>;
}
export function SavedLinks({ ctx, onDeleted }: {
    ctx: AppContext;
    onDeleted?: (id: string) => void;
}) {
    const { t } = useI18n();
    const [page, setPage] = useState(1);
    const endpoint = `/affiliate-links?perPage=10&page=${page}`;
    const q = useQuery<Data[]>({ queryKey: [endpoint], queryFn: () => api<Data[]>(endpoint), enabled: ctx.me?.role === "customer", refetchInterval: 30000 });
    if (ctx.me?.role !== "customer")
        return null;
    const rows = Array.isArray(q.data) ? q.data : [];
    return <section aria-label={t("Link của bạn")}><Card title={t("Link của bạn")}>
  {q.isPending ? <p role="status">{t("Đang tải…")}</p> : q.isError ? <div><p role="alert">{t("Chưa tải được dữ liệu. Vui lòng thử lại.")}</p><button className="btn sm" onClick={() => void q.refetch()}>{t("Thử lại")}</button></div> : rows.length ? <div className="stack">{rows.map(link => <SavedLink key={link.id} link={link} ctx={ctx} onDeleted={id => { onDeleted?.(id); if (rows.length === 1 && page > 1)
        setPage(page - 1); }}/>)}</div> : <p>{t("Chưa có link.")}</p>}
  <div className="row wrap"><button className="btn sm ghost" disabled={page === 1 || q.isFetching} onClick={() => setPage(page - 1)}>{t("← Trước")}</button><span>{t("Trang")} {page}</span><button className="btn sm ghost" disabled={rows.length < 10 || q.isFetching} onClick={() => setPage(page + 1)}>{t("Tiếp →")}</button></div>
 </Card></section>;
}
