"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, Clock3, Copy } from "lucide-react";
import { api } from "@/lib/api";
import type {SavedAffiliateLink,CreatedAffiliateLink} from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { linkExpired, useLinkClock } from "@/lib/link-expiry";
import type { AppContext } from "./hoanxu";

export function LinkDeadline({ link }: { link: SavedAffiliateLink|CreatedAffiliateLink }) {
  const { t, language } = useI18n();
  const now = useLinkClock(link.expiresAt || undefined);
  if (link.legacy) return <p className="small mute">{t("Link lịch sử — chỉ đọc")}</p>;
  const expiry = Date.parse(link.expiresAt || "");
  const remaining = expiry - now;
  const expired = !Number.isFinite(remaining) || remaining <= 0;
  const cancelled = link.status === "cancelled" || (expired && (!link.status || link.status === "active"));
  const minutes = Math.max(0, Math.ceil(remaining / 60000));
  const countdown = cancelled && !expired ? t("Đã cancel") : expired ? t("Đã hết hạn") : remaining >= 86400000
    ? `${t("Còn")} ${Math.ceil(remaining / 86400000)} ${t("ngày")}`
    : language === "en" ? `${t("Còn")} ${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${t("Còn")} ${Math.floor(minutes / 60)} ${t("giờ")} ${minutes % 60} ${t("phút")}`;
  const deadline = Number.isFinite(expiry) ? new Date(expiry).toLocaleString(language === "en" ? "en-GB" : "vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—";
  return <>
    <div className={`link-deadline${expired || cancelled ? " is-expired" : remaining < 86400000 ? " is-urgent" : ""}`}>
      <div className="link-deadline-label"><span><Clock3 size={14} aria-hidden="true" />{t("Hạn hoàn Xu")}</span><time dateTime={link.expiresAt || undefined}>{deadline} (GMT+7)</time></div>
      <strong className="link-countdown" aria-label={`${t("Hạn hoàn Xu")}: ${countdown}`}>{countdown}</strong>
    </div>
    {cancelled && <p className="small err link-cancel-notice" role="status">{t(expired ? "Link đã bị cancel — hết thời hạn hoàn Xu" : "Link đã bị cancel — đơn đã bị hủy hoặc từ chối")}</p>}
    {(link.status === "progress" || link.status === "completed") && expired && <p className="small mute">{t("Hạn mua mới đã hết; đơn đặt đúng hạn tiếp tục được đối soát.")}</p>}
  </>;
}

export function SavedLink({ link, ctx, result = false, showName = true, embedded = false }: {
  link: SavedAffiliateLink|CreatedAffiliateLink; ctx: AppContext; result?: boolean; showName?: boolean; embedded?: boolean;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const detail = useQuery<SavedAffiliateLink>({ queryKey: [`/affiliate-links/${link.id}`], queryFn: () => api(`/affiliate-links/${link.id}`), enabled: result && Boolean(link.id) && !link.legacy, refetchInterval: 30000, retry: false });
  const current = detail.data?.id === link.id && detail.data ? detail.data : link;
  const now = useLinkClock(current.expiresAt || undefined);
  const expired = linkExpired(current.expiresAt || undefined, now);
  const unavailable = expired || current.legacy || current.status === "cancelled";
  useEffect(() => { setCopied(false); }, [link.trackingCode]);
  async function copy() {
    if (linkExpired(current.expiresAt || undefined) || current.legacy || current.status === "cancelled") return;
    try { await navigator.clipboard.writeText(current.affiliateUrl); setCopied(true); ctx.notify(t("Đã sao chép")); }
    catch { ctx.notify(t("Chọn link để sao chép thủ công")); }
  }
  const Container = embedded ? "div" : "article";
  return <Container className={result ? "out composer-result" : embedded ? "purchase-link-details" : "saved-link"} data-link-id={current.id} role={result ? "region" : undefined} aria-label={result ? t("Link của bạn đã sẵn sàng") : undefined} aria-live={result ? "polite" : undefined}>
    {result && <div className="composer-result-heading"><span aria-hidden="true"><Check size={17}/></span><h3>{t("Link của bạn đã sẵn sàng")}</h3></div>}
    {!result && showName && <h3 className="saved-link-name">{current.productName || t("Tên sản phẩm chưa có")}</h3>}
    <div className="saved-link-row">
      <code tabIndex={0} aria-label={t("Link hoàn tiền")} title={current.affiliateUrl}>{current.affiliateUrl}</code>
      <div className="composer-result-actions">
        <button type="button" className="btn sm" aria-label={t(copied ? "Đã sao chép" : "Sao chép")} title={t(copied ? "Đã sao chép" : "Sao chép")} disabled={unavailable} onClick={() => void copy()}><Copy size={15} aria-hidden="true"/><span>{t(copied ? "Đã sao chép" : "Sao chép")}</span></button>
        <a className="btn sm ghost" aria-label={t("Mở để mua")} title={t("Mở để mua")} aria-disabled={unavailable} tabIndex={unavailable ? -1 : undefined} href={unavailable ? undefined : current.affiliateUrl} onClick={event => { if (linkExpired(current.expiresAt) || current.legacy || current.status === "cancelled") event.preventDefault(); }} target="_blank" rel="noopener noreferrer"><span>{t("Mở để mua")}</span><ArrowUpRight size={15} aria-hidden="true"/></a>
      </div>
    </div>
    <LinkDeadline link={current}/>
  </Container>;
}
