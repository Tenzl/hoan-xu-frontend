"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ClipboardPaste, Link2, Package, ShieldCheck, X } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { SavedLink, SavedLinks } from "./saved-links";
import type { RewardSnapshot } from "@/lib/wallet-preview";
import type { AppContext } from "./hoanxu";
import { LinkWallet } from "./link-wallet";
import { ProductCommission, type ProductCheckState } from "./product-commission";
import { Status, type Data } from "./ui";

export function CashbackLinkBuilder({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const [url, setURL] = useState("");
  const [result, setResult] = useState<(Data & RewardSnapshot) | null>(null);

  const [check, setCheck] = useState<ProductCheckState>({ url: "", loading: false });
  const onCheck = useCallback((state: ProductCheckState) => setCheck(state), []);
  const activeCheck = check.url === url.trim() ? check : { url: url.trim(), loading: Boolean(url.trim()) };
  const [creating, setCreating] = useState(false);
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
      if (version.current === current) setResult(link);
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

  return <><div className="cashback-workspace">
    <section className="link-composer" aria-labelledby="link-composer-title">
      <div className="composer-heading">
        <span className="composer-symbol" aria-hidden="true"><Link2 size={22} /></span>
        <div><span className="composer-eyebrow">Shopee Affiliate</span><h2 id="link-composer-title">{t("Dán link sản phẩm, nhận link hoàn tiền")}</h2></div>
      </div>
      <p className="composer-description">{t("Dán link liền tay, xem tiền hoàn ngay.")}</p>
      <form className="composer-form" onSubmit={create}>
        <div className="composer-input-group">
          <div className="composer-label-row"><label htmlFor="cashback-product-url">{t("Link sản phẩm Shopee")}</label><button type="button" className="composer-paste" onClick={paste}><ClipboardPaste size={14} />{t("Dán link")}</button></div>
          <div className="composer-url">
            <Link2 size={18} aria-hidden="true" />
            <input ref={input} id="cashback-product-url" type="url" required maxLength={2048} value={url} placeholder="https://shopee.vn/..." autoComplete="off" spellCheck={false} aria-describedby="cashback-input-hint" onChange={(event) => changeURL(event.target.value)} />
            {url && <button type="button" className="composer-clear" aria-label={t("Xóa link sản phẩm")} onClick={() => { changeURL(""); input.current?.focus(); }}><X size={16} /></button>}
          </div>
          <p id="cashback-input-hint" className="composer-hint">{t("Món thích mê say, dán link thử ngay.")}</p>
          {pasteError && <p className="err" role="alert">{pasteError}</p>}
        </div>

        {url.trim() ? <ProductCommission url={url} onState={onCheck} membership={membership} snapshot={result} customer={ctx.me?.role === "customer"} membershipLoading={dashboard.isPending} membershipError={dashboard.isError} onRetryMembership={() => void dashboard.refetch()} /> : <div className="composer-empty">
          <span className="composer-empty-icon" aria-hidden="true"><Package size={26} strokeWidth={1.5} /></span>
          <div><h3>{t("Sản phẩm của bạn sẽ hiển thị ở đây")}</h3><p>{t("Dán link liền tay, xem tiền hoàn ngay.")}</p></div>
        </div>}

        <div className="composer-submit-row">
          <button type="submit" className="btn composer-submit" disabled={!url.trim() || creating}>
            {creating ? t("Đang tạo link…") : t("Lấy link hoàn tiền")}{!creating && <ArrowUpRight size={17} />}
          </button>
          <p><ShieldCheck size={14} aria-hidden="true" />{t("Mua sắm thả ga, tích Xu đổi quà.")}</p>
        </div>
        {!ctx.me && <p className="composer-login"><Link href="/login">{t("Đăng nhập Google")}</Link> {t("để tạo link hoàn tiền.")}</p>}
        {error && <p className="err" role="alert">{t(error)}</p>}
      </form>

      {result && <SavedLink key={result.trackingCode} link={result} ctx={ctx} result onDeleted={() => { version.current++; setResult(null); }} />}

      <div className="composer-channels" aria-label={t("Các sàn liên kết")}>
        <span className="small mute">{t("Sàn liên kết")}</span>
        {channels.isPending ? <span className="small mute">{t("Đang tải…")}</span> : channels.isError ? <button type="button" className="composer-paste" onClick={() => void channels.refetch()}>{t("Thử lại")}</button> : channels.data?.map((channel) => <span className="composer-channel" key={channel.id}><span className={"channel-dot " + (channel.status === "available" ? "available" : "")} aria-hidden="true" />{channel.name}<Status value={channel.status} label={channel.status === "not_configured" ? t("Chưa mở") : undefined} /></span>)}
      </div>
    </section>

    <LinkWallet ctx={ctx} dashboard={dashboard} check={activeCheck} snapshot={result} />
    <div className="link-guide">
      <section className="link-howto">
        <span className="composer-eyebrow">{t("3 bước để tích lũy")}</span>
        <h2>{t("Sắm món mình mê, rước quà mang về")}</h2>
        <ol className="link-steps">
          <li><span aria-hidden="true">1</span><div><h3>{t("Dán & kiểm tra")}</h3><p>{t("Dán link liền tay, xem tiền hoàn ngay.")}</p></div></li>
          <li><span aria-hidden="true">2</span><div><h3>{t("Tạo link & mua hàng")}</h3><p>{t("Mở link hoàn tiền của bạn rồi mua sắm như thường lệ.")}</p></div></li>
          <li><span aria-hidden="true">3</span><div><h3>{t("Tích Xu, chọn quà")}</h3><p>{t("Tích Xu đổi quà, niềm vui về nhà.")}</p></div></li>
        </ol>
        <p className="link-guide-note">{t("Mua sắm gần xa, tích Xu đổi quà.")}</p>
        <Link className="link-help" href="/help">{t("Tìm hiểu cách hoàn tiền")}<ArrowUpRight size={14} /></Link>
      </section>
    </div>
  </div><SavedLinks ctx={ctx} onDeleted={(id) => { if (result?.id === id) { version.current++; setResult(null); } }} /></>;
}
