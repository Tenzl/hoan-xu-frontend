"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bookmark, Check, ClipboardPaste, Copy, Link2, Package, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import { shareRange, tierName } from "@/lib/cashback";
import { useI18n } from "@/lib/i18n";
import type { AppContext } from "./hoanxu";
import { LinkWallet } from "./link-wallet";
import { ProductCommission, type ProductCheckState } from "./product-commission";
import { Status, type Data } from "./ui";

export function CashbackLinkBuilder({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const [url, setURL] = useState("");
  const [check, setCheck] = useState<ProductCheckState>();
  const [result, setResult] = useState<Data | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [pasteError, setPasteError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  const channels = useQuery({ queryKey: ["/affiliate-channels"], queryFn: () => api<Data[]>("/affiliate-channels") });
  const dashboard = useQuery({ queryKey: ["/me/dashboard"], queryFn: () => api<Data>("/me/dashboard"), enabled: ctx.me?.role === "customer" });
  const membership = dashboard.data?.membership;

  function changeURL(value: string) {
    version.current++;
    setURL(value);
    setResult(null);
    setCopied(false);
    setSaved(false);
    setError("");
    setPasteError("");
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    if (!ctx.me || ctx.me.role !== "customer") {
      ctx.notify(t("Đăng nhập Google để tạo link."));
      return;
    }
    const current = version.current;
    setCreating(true);
    setError("");
    try {
      const link = await ctx.act("/affiliate-links", "POST", { url: url.trim() });
      if (version.current === current) { setResult(link); setCopied(false); setSaved(false); }
    } catch (e) {
      if (version.current === current) setError((e as Error).message);
    } finally { setCreating(false); }
  }
  async function paste() {
    setPasteError("");
    try {
      const value = await navigator.clipboard.readText();
      if (value.trim()) changeURL(value.trim());
    } catch { setPasteError(t("Không đọc được clipboard. Dán link trực tiếp vào ô bên dưới.")); }
    input.current?.focus();
  }

  return <div className="cashback-workspace">
    <section className="link-composer" aria-labelledby="link-composer-title">
      <div className="composer-heading">
        <span className="composer-symbol" aria-hidden="true"><Link2 size={22} /></span>
        <div><span className="composer-eyebrow">Shopee Affiliate</span><h2 id="link-composer-title">{t("Dán link sản phẩm, nhận link hoàn tiền")}</h2></div>
      </div>
      <p className="composer-description">{t("Kiểm tra hoa hồng trước. Tạo link riêng để đơn mua được ghi nhận cho bạn.")}</p>
      <form className="composer-form" onSubmit={create}>
        <div className="composer-input-group">
          <div className="composer-label-row"><label htmlFor="cashback-product-url">{t("Link sản phẩm Shopee")}</label><button type="button" className="composer-paste" onClick={paste}><ClipboardPaste size={14} />{t("Dán link")}</button></div>
          <div className="composer-url">
            <Link2 size={18} aria-hidden="true" />
            <input ref={input} id="cashback-product-url" type="url" required maxLength={2048} value={url} placeholder="https://shopee.vn/..." autoComplete="off" spellCheck={false} aria-describedby="cashback-input-hint" onChange={(event) => changeURL(event.target.value)} />
            {url && <button type="button" className="composer-clear" aria-label={t("Xóa link sản phẩm")} onClick={() => { changeURL(""); input.current?.focus(); }}><X size={16} /></button>}
          </div>
          <p id="cashback-input-hint" className="composer-hint">{t("Thông tin sản phẩm và hoa hồng tự xuất hiện sau khi dán link.")}</p>
          {pasteError && <p className="err" role="alert">{pasteError}</p>}
        </div>

        {url.trim() ? <ProductCommission url={url} onState={setCheck} /> : <div className="composer-empty">
          <span className="composer-empty-icon" aria-hidden="true"><Package size={26} strokeWidth={1.5} /></span>
          <div><h3>{t("Sản phẩm của bạn sẽ hiển thị ở đây")}</h3><p>{t("Tên sản phẩm, giá và hoa hồng dự kiến — xem trước khi mua.")}</p></div>
        </div>}

        <div className="composer-submit-row">
          <button type="submit" className="btn composer-submit" disabled={!url.trim() || creating}>
            {creating ? t("Đang tạo link…") : t("Lấy link hoàn tiền")}{!creating && <ArrowUpRight size={17} />}
          </button>
          <p><ShieldCheck size={14} aria-hidden="true" />{t("Link gắn tracking riêng cho tài khoản của bạn.")}</p>
        </div>
        {!ctx.me && <p className="composer-login"><Link href="/login">{t("Đăng nhập Google")}</Link> {t("để tạo và lưu link hoàn tiền.")}</p>}
        {error && <p className="err" role="alert">{t(error)}</p>}
      </form>

      {result && <section className="out composer-result" aria-label={t("Link của bạn đã sẵn sàng")} aria-live="polite">
        <div className="composer-result-heading"><span aria-hidden="true"><Check size={17} /></span><h3>{t("Link của bạn đã sẵn sàng")}</h3></div>
        <p className="small mute">{t("Mở link này để mua hàng và ghi nhận hoàn tiền.")}</p>
        <code tabIndex={0} aria-label={t("Link hoàn tiền")}>{result.affiliateUrl}</code>
        <div className="composer-result-actions">
          <button type="button" className="btn sm" onClick={async () => {
            const current = version.current;
            try {
              await navigator.clipboard.writeText(result.affiliateUrl);
              if (current === version.current) setCopied(true);
              ctx.notify(t("Đã sao chép"));
            } catch { ctx.notify(t("Chọn link để sao chép thủ công")); }
          }}>{copied ? <Check size={15} /> : <Copy size={15} />}{t(copied ? "Đã sao chép" : "Sao chép")}</button>
          <a className="btn sm ghost" href={result.affiliateUrl} target="_blank" rel="noopener noreferrer">{t("Mở để mua")}<ArrowUpRight size={15} /></a>
          <button type="button" className="btn sm ghost" disabled={saving || saved} onClick={async () => {
            const current = version.current;
            setSaving(true);
            try { await ctx.act("/affiliate-links/" + result.id, "PATCH", { saved: true }); if (current === version.current) setSaved(true); }
            catch (e) { if (current === version.current) setError((e as Error).message); }
            finally { setSaving(false); }
          }}>{saved ? <Check size={15} /> : <Bookmark size={15} />}{t(saved ? "Đã lưu link" : saving ? "Đang lưu…" : "Lưu link")}</button>
        </div>
        <div className="composer-result-meta"><span>{t(tierName(result.tierCode))} · {shareRange(result.minSharePercent, result.maxSharePercent)}</span><span>Tracking: {result.trackingCode}</span></div>
      </section>}

      <div className="composer-channels" aria-label={t("Các sàn liên kết")}>
        <span className="small mute">{t("Sàn liên kết")}</span>
        {channels.isPending ? <span className="small mute">{t("Đang tải…")}</span> : channels.isError ? <button type="button" className="composer-paste" onClick={() => void channels.refetch()}>{t("Thử lại")}</button> : channels.data?.map((channel) => <span className="composer-channel" key={channel.id}><span className={"channel-dot " + (channel.status === "available" ? "available" : "")} aria-hidden="true" />{channel.name}<Status value={channel.status} /></span>)}
      </div>
    </section>

    <LinkWallet ctx={ctx} dashboard={dashboard} check={check?.url === url.trim() ? check : undefined} snapshot={result} />
    <div className="link-guide">
      <section className="link-howto">
        <span className="composer-eyebrow">{t("3 bước để tích lũy")}</span>
        <h2>{t("Để đơn được ghi nhận")}</h2>
        <ol className="link-steps">
          <li><span aria-hidden="true">1</span><div><h3>{t("Dán & kiểm tra")}</h3><p>{t("Xem sản phẩm và hoa hồng dự kiến ngay dưới ô link.")}</p></div></li>
          <li><span aria-hidden="true">2</span><div><h3>{t("Tạo link & mua hàng")}</h3><p>{t("Tạo và mở link trước khi mua.")}</p></div></li>
          <li><span aria-hidden="true">3</span><div><h3>{t("Chờ duyệt hoàn tiền")}</h3><p>{t("Tracking phải được ghi nhận trong báo cáo của sàn.")}</p></div></li>
        </ol>
        <p className="link-guide-note">{t("Tiền được duyệt sau khi đối soát, đơn hủy/hoàn không được tính.")}</p>
        <Link className="link-help" href="/help">{t("Tìm hiểu cách hoàn tiền")}<ArrowUpRight size={14} /></Link>
      </section>
    </div>
  </div>;
}
