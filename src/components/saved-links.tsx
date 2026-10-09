"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, Clock3, Copy, Link2, QrCode, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {SavedAffiliateLink,CreatedAffiliateLink} from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { linkExpired, useLinkClock } from "@/lib/link-expiry";
import type { AppContext } from "./hoanxu";
import { Modal } from "./ui";
import { Button } from "./ui/button";
import { shopeeShareURL } from "@/lib/shopee-share";
import { LinkQR } from "./link-qr";
import { Typewriter } from "./ui/typewriter-text";

export function savedLinkDeleteAt(link:SavedAffiliateLink|CreatedAffiliateLink) {
 if(link.autoDeleteAt)return link.autoDeleteAt;
 const created=Date.parse(link.createdAt||"");
 return Number.isFinite(created)?new Date(created+5*86400000).toISOString():link.expiresAt;
}

export function LinkDeadline({link}:{link:SavedAffiliateLink|CreatedAffiliateLink}) {
 const {t,language}=useI18n();
 const deadline=savedLinkDeleteAt(link);
 const now=useLinkClock(deadline||undefined);
 if(link.legacy)return <p className="small mute">{t("Link lịch sử — chỉ đọc")}</p>;
 const at=Date.parse(deadline||""),remaining=at-now;
 const minutes=Math.max(0,Math.ceil(remaining/60000));
 const countdown=remaining<=0?t("Đã xóa tự động"):remaining>=86400000?`${Math.ceil(remaining/86400000)} ${t("ngày")}`:language==="en"?`${Math.floor(minutes/60)}h ${minutes%60}m`:`${Math.floor(minutes/60)} ${t("giờ")} ${minutes%60} ${t("phút")}`;
 const formatted=Number.isFinite(at)?new Date(at).toLocaleString(language==="en"?"en-GB":"vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
 return <div className="link-deadline"><div className="link-deadline-label"><span><Clock3 size={14} aria-hidden="true"/>{t("Tự xóa sau")}</span><time dateTime={deadline||undefined}>{formatted} (GMT+7)</time></div><strong className="link-countdown" aria-label={`${t("Tự xóa sau")}: ${countdown}`}>{countdown}</strong></div>;
}

export function SavedLink({ link, ctx, result = false, showName = true, embedded = false, onDeleted }: {
  link: SavedAffiliateLink|CreatedAffiliateLink; ctx: AppContext; result?: boolean; showName?: boolean; embedded?: boolean; onDeleted?: () => void;
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [showQR, setShowQR] = useState(false);
  const linkText = useRef<HTMLElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const reused = result && "reused" in link && link.reused;
  const detail = useQuery<SavedAffiliateLink>({ queryKey: [`/affiliate-links/${link.id}`], queryFn: () => api(`/affiliate-links/${link.id}`), enabled: result && Boolean(link.id) && !link.legacy, refetchInterval: 30000, retry: false });
  const current = detail.data?.id === link.id && detail.data ? detail.data : link;
  const shareURL = shopeeShareURL(current.affiliateUrl, origin);
  const deadline = savedLinkDeleteAt(current);
  const now = useLinkClock(deadline || undefined);
  const expired = !current.legacy && linkExpired(deadline || undefined, now);
  const missing = detail.error instanceof ApiError && detail.error.status === 404;
  const unavailable = expired || current.legacy || missing;
  useEffect(() => { if (result && (expired || missing)) onDeleted?.(); }, [result, expired, missing, onDeleted]);
  useEffect(() => { setCopied(false); }, [link.trackingCode]);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  async function copy() {
    if (linkExpired(savedLinkDeleteAt(current) || undefined) || current.legacy || missing) return;
    try { await navigator.clipboard.writeText(shopeeShareURL(current.affiliateUrl, window.location.origin)); setCopied(true); ctx.notify(t("Đã sao chép")); }
    catch {
      if (result) { ctx.notify(t("Không sao chép được")); return; }
      linkText.current?.focus();
      if (linkText.current) {
        const range = document.createRange();
        range.selectNodeContents(linkText.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      ctx.notify(t("Chọn link để sao chép thủ công"));
    }
  }
  async function remove() {
    if (deleting || !current.canDelete) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await ctx.act(`/affiliate-links/${current.id}`, "DELETE");
      setConfirmDelete(false);
      onDeleted?.();
      ctx.notify(t("Đã xóa link."));
    } catch (error) { setDeleteError((error as Error).message); }
    finally { setDeleting(false); }
  }
  if (expired || missing) return null;
  const shortCode = /^https:\/\/s\.shopee\.vn\/([A-Za-z0-9]+)$/.exec(current.affiliateUrl)?.[1];
  const animateURL = result && Boolean(origin) && Boolean(shortCode) && shareURL !== current.affiliateUrl;
  const sharePrefix = origin ? `${new URL(origin).host}/shopee/` : "s.shopee.vn/";
  const copyButton = <button type="button" className={result ? "btn sm result-copy-button" : "btn sm ghost"} aria-label={t(copied ? "Đã sao chép" : "Sao chép link")} title={t(copied ? "Đã sao chép" : "Sao chép link")} disabled={unavailable} onClick={() => void copy()}>{copied ? <Check size={17} aria-hidden="true"/> : <Copy size={17} aria-hidden="true"/>}<span>{t(copied ? "Đã sao chép" : "Sao chép link")}</span></button>;
  const urlText = <code ref={linkText} tabIndex={result ? undefined : 0} aria-label={t("Link hoàn tiền")} title={shareURL}>{shareURL}</code>;
  const Container = embedded ? "div" : "article";
  return <Container className={result ? "out composer-result" : embedded ? "purchase-link-details" : "purchase-entry saved-link"} data-link-id={current.id} role={result ? "region" : undefined} aria-label={result ? t("Link của bạn đã sẵn sàng") : undefined} aria-live={result ? "polite" : undefined}>
    {result && <div className="composer-result-heading"><span aria-hidden="true"><Check size={20}/></span><h3>{t(reused ? "Bạn đã có link còn hiệu lực cho sản phẩm này" : "Link của bạn đã sẵn sàng")}</h3></div>}
    {reused && <p className="saved-link-reuse-note">{t("Sao chép link bên dưới để tiếp tục mua hàng. Nếu muốn tạo link mới, hãy xóa link hiện tại trước.")}</p>}
    {!result && showName && <h3 className="saved-link-name">{current.productName || t("Tên sản phẩm chưa có")}</h3>}
    <div className="saved-link-row">
      {result ? <div className="result-link-block">
        <span className="result-link-label"><Link2 size={14} aria-hidden="true"/>{t("Link hoàn tiền")}</span>
        <div className={`link-url-field${animateURL ? "" : " is-settled"}${copied ? " is-copied" : ""}`}>
          <div className="link-url-display">
            {urlText}
            {animateURL && <span className="link-url-animation" aria-hidden="true" aria-live="off"><Typewriter
              text={["s.shopee.vn/", sharePrefix]}
              prefix={["https://", `${origin ? new URL(origin).protocol : "https:"}//`]}
              suffix={shortCode}
              speed={100 / 1.2}
              deleteSpeed={50 / 1.2}
              cursor=""
              startWithLastText
              loop
              repeatDelay={3000}
              textClassNames={["link-url-source", "link-url-destination"]}
            /></span>}
            <span className="link-url-glass" aria-hidden="true"/>
          </div>
          {copyButton}
        </div>
      </div> : urlText}
      <div className="composer-result-actions">
        <a className="btn sm" aria-label={t("Mở Shopee để mua")} title={t("Mở Shopee để mua")} aria-disabled={unavailable} tabIndex={unavailable ? -1 : undefined} href={unavailable ? undefined : current.affiliateUrl} onClick={event => { if (linkExpired(savedLinkDeleteAt(current)) || current.legacy || missing) event.preventDefault(); }} target="_blank" rel="noopener noreferrer"><span>{t("Mở Shopee để mua")}</span><ArrowUpRight size={15} aria-hidden="true"/></a>
        {!result && copyButton}
        <button type="button" className="btn sm ghost" aria-label={t("Chia sẻ QR")} title={t("Chia sẻ QR")} disabled={unavailable} onClick={() => { if (!linkExpired(savedLinkDeleteAt(current))) setShowQR(true); }}><QrCode size={15} aria-hidden="true"/><span>{t("Chia sẻ QR")}</span></button>
        {current.canDelete && !current.legacy && <Button type="button" variant="ghost" size="sm" className="saved-link-delete" onClick={() => { setDeleteError(""); setConfirmDelete(true); }}><Trash2 size={15} aria-hidden="true"/><span>{t("Xóa link")}</span></Button>}
      </div>
    </div>
    <LinkDeadline link={current}/>
    {showQR && !unavailable && <LinkQR key={current.affiliateUrl} url={current.affiliateUrl} onClose={() => setShowQR(false)} />}
    {confirmDelete && <Modal title="Xóa link để tạo link mới?" onClose={() => { if (!deleting) setConfirmDelete(false); }}>
      <div className="stack">
        <p>{t("Bạn muốn xóa link này để tạo link mới? Xóa link không ảnh hưởng đến đơn hoặc tiền hoàn. Giao dịch mua qua link cũ vẫn được ghi nhận nếu Shopee báo cáo với tracking hợp lệ.")}</p>
        {deleteError && <p className="err" role="alert">{t(deleteError)}</p>}
        <div className="row end">
          <Button type="button" variant="outline" disabled={deleting} onClick={() => setConfirmDelete(false)}>{t("Giữ lại link")}</Button>
          <Button type="button" disabled={deleting} aria-busy={deleting} onClick={() => void remove()}>{t(deleting ? "Đang xử lý…" : "Xóa link")}</Button>
        </div>
      </div>
    </Modal>}
  </Container>;
}
