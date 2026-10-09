"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useData } from "./screen-shared";
import { ArrowUpRight, ClipboardPaste, Link2, Package, ShieldCheck, X } from "lucide-react";
import type {Dashboard} from "@/lib/domain";
import { useI18n } from "@/lib/i18n";
import { AffiliateChannels } from "./affiliate-channels";
import { SavedLink } from "./saved-links";
import type { AppContext } from "./hoanxu";
import { useCashbackFlow } from "./cashback-flow";
import { ProductCommission } from "./product-commission";

export function CashbackLinkBuilder({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const flow = useCashbackFlow();
  const { url, result, check, creating, error, shopBlocked } = flow;
  const [pasteError, setPasteError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const composer = useRef<HTMLElement>(null);
  const dashboard = useData<Dashboard>("/me/dashboard", ctx.me?.role === "customer", ctx.me?.id);
  const membership = dashboard.data?.membership;

  useEffect(() => {
    if (!result) return;
    composer.current?.querySelector(".composer-result")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "start",
      inline: "nearest",
    });
  }, [result]);

  function changeURL(value: string) {
    setPasteError("");
    flow.changeURL(value);
  }
  function reset() {
    changeURL("");
    input.current?.focus();
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (result) { reset(); return; }
    await flow.create(ctx);
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
    <section ref={composer} className="link-composer" aria-labelledby="link-composer-title">
      <div className="composer-heading">
        <span className="composer-symbol" aria-hidden="true"><Link2 size={22} /></span>
        <div><h2 id="link-composer-title">{t("Dán link sản phẩm, nhận link hoàn tiền")}</h2></div>
      </div>
      <p className="composer-description">{t("Dán link liền tay, xem tiền hoàn ngay.")}</p>
      <form className="composer-form" onSubmit={create} aria-busy={creating || check.loading}>
        <div className="composer-input-group">
          <div className="composer-label-row"><label htmlFor="cashback-product-url">{t("Link sản phẩm Shopee")}</label><button type="button" className="composer-paste" onClick={paste}><ClipboardPaste size={14} />{t("Dán link")}</button></div>
          <div className="composer-url">
            <Link2 size={18} aria-hidden="true" />
            <input ref={input} id="cashback-product-url" type="text" inputMode="url" required maxLength={2048} value={url} placeholder="https://shopee.vn/..." autoComplete="off" spellCheck={false} onChange={(event) => changeURL(event.target.value)} />
            {url && <button type="button" className="composer-clear" aria-label={t("Xóa link sản phẩm")} onClick={() => { changeURL(""); input.current?.focus(); }}><X size={16} /></button>}
          </div>
          {flow.inputError && <p className="err" role="alert">{t(flow.inputError)}</p>}
          {pasteError && <p className="err" role="alert">{pasteError}</p>}
        </div>

        {url.trim() && !flow.inputError ? <ProductCommission check={check} onRetry={flow.retryCheck} membership={membership} snapshot={result} customer={ctx.me?.role === "customer"} membershipLoading={dashboard.isPending} membershipError={dashboard.isError} onRetryMembership={() => void dashboard.refetch()} /> : <div className="composer-empty">
          <span className="composer-empty-icon" aria-hidden="true"><Package size={26} strokeWidth={1.5} /></span>
          <div><h3>{t("Sản phẩm của bạn sẽ hiển thị ở đây")}</h3><p>{t("Dán link liền tay, xem tiền hoàn ngay.")}</p></div>
        </div>}

        <div className="composer-submit-row">
          <button type={result ? "button" : "submit"} onClick={result ? reset : undefined} className="btn composer-submit" aria-busy={!result && (creating || check.loading)} disabled={creating || (!result && (!!flow.inputError || !url.trim() || check.loading || shopBlocked))}>
            {t(result ? "Lấy link món mới" : creating ? "Đang xử lý…" : check.loading ? "Đang kiểm tra…" : "Lấy link hoàn tiền")}{!creating && (result || !check.loading) && <ArrowUpRight size={17} aria-hidden="true" />}
          </button>
          <p><ShieldCheck size={14} aria-hidden="true" />{t("Mua sắm thả ga, tích Xu đổi quà.")}</p>
        </div>
        {!ctx.me && <p className="composer-login"><Link href="/login" onClick={flow.prepareLogin}>{t("Đăng nhập Google")}</Link> {t("để tạo link hoàn tiền.")}</p>}
        {error && <p className="err" role="alert">{t(error)}</p>}
      </form>

      {result && <>
        <SavedLink key={result.trackingCode} link={result} ctx={ctx} result onDeleted={flow.clearResult} />
        <section className="composer-reward-note" aria-labelledby="composer-reward-note-title">
          <h3 id="composer-reward-note-title">{t("Lưu ý khi mua hàng")}</h3>
          <p>{t("Điểm hiển thị là")} <strong>{t("tạm tính")}</strong>. {t("Điểm thực nhận được tính theo giá trị đơn hàng sau khi trừ voucher và mã giảm giá.")}</p>
          <p>{t("Nếu mua nhiều sản phẩm trong cùng một đơn, điểm tích lũy được cộng theo số lượng sản phẩm đủ điều kiện.")}</p>
          <p>{t("Một số ngành hàng Shopee có thể giới hạn tối đa 50.000 điểm/đơn. Với đơn giá trị lớn, bạn có thể cân nhắc tách đơn hoặc")} <Link href="/help">{t("liên hệ hỗ trợ để được tư vấn.")}</Link></p>
        </section>
        <p className="composer-orders-note" role="status">{t("Đơn hàng sẽ được ghi nhận trong vòng 24 giờ sau khi bạn nhấn mua qua link hoàn tiền.")} <Link href="/orders/pending">{t("Xem đơn hàng")}<ArrowUpRight size={13} aria-hidden="true" /></Link></p>
      </>}

      <AffiliateChannels/>
    </section>

  </div></>;
}
