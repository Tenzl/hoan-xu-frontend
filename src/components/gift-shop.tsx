"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Check, Gift, History, Ticket } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { GiftImage, GiftDescription } from "./gift-details";
import type { AppContext } from "./app-context";
import { XuAmount } from "./xu-amount";
import { XuExchange } from "./xu-exchange";

type CatalogGift = components["schemas"]["Gift"];
type Wallet = components["schemas"]["Wallet"];

export function GiftShop({ ctx }: { ctx: AppContext }) {
  const { t, language } = useI18n();
  const wallet = useQuery({ queryKey: ["/wallet",ctx.me?.id], queryFn: () => api<Wallet>("/wallet"), refetchInterval: 15000 });
  const catalog = useQuery({ queryKey: ["/gifts"], queryFn: () => api<CatalogGift[]>("/gifts"), refetchInterval: 15000 });
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const sending = useRef(false);
  const [success, setSuccess] = useState<{ name: string; cost: number } | null>(null);
  const [uncertain, setUncertain] = useState<CatalogGift | null>(null);
  const available = wallet.data?.greenAvailable;
  const balanceReady = !wallet.isPending && !wallet.isError && Number.isSafeInteger(available) && Number(available) >= 0;
  const gifts = (catalog.data || []).filter(gift => gift.active);

  async function redeem(gift: CatalogGift, retry = false) {
    if (sending.current || (!retry && (uncertain !== null || !balanceReady || gift.stock < 1 || !Number.isSafeInteger(gift.costXu) || gift.costXu <= 0 || Number(available) < gift.costXu))) return;
    sending.current = true;
    setRedeeming(gift.id);
    setSuccess(null);
    try {
      await ctx.act("/gift-redemptions", "POST", { giftId: gift.id, expectedCostXu: gift.costXu });
      setUncertain(null);
      setSuccess({ name: gift.name, cost: gift.costXu });
    } catch (error) {
      // Keep the original quote/key on uncertain network errors. Known failures
      // refresh the balance and catalog before the customer tries again.
      if (error instanceof ApiError && error.status >= 500) {
        setUncertain(gift);
      } else {
        setUncertain(null);
        await Promise.allSettled([wallet.refetch(), catalog.refetch()]);
      }
    } finally {
      sending.current = false;
      setRedeeming(null);
    }
  }

  return <section className="gift-shop" aria-label={t("Đổi quà")}>
    <div className="gift-overview">
    <section className="gift-wallet" aria-label={t("Xu xanh của bạn")}>
      <div className="gift-wallet-main">
        <span className="gift-wallet-label"><span className="gift-wallet-mark"><Gift size={18} aria-hidden="true"/></span>{t("Xu xanh của bạn")}</span>
        <strong className={`num${Number(available) >= 1e9 ? " is-large" : ""}`} aria-live="polite">{balanceReady ? <XuAmount amount={Number(available)} currency="green"/> : "—"}</strong>
        <p className="gift-wallet-caption">{t("Sẵn sàng đổi món quà bạn thích.")}</p>
        {wallet.isPending && <p role="status">{t("Đang tải số dư…")}</p>}
        {!wallet.isPending && !balanceReady && <div className="gift-wallet-error" role="alert"><p>{t("Chưa tải được số dư. Vui lòng thử lại.")}</p><button className="btn sm ghost" onClick={() => void wallet.refetch()}>{t("Thử lại số dư")}</button></div>}
        {balanceReady && Number(wallet.data?.greenGiftHeld) > 0 && <p>{t("Đang chờ đổi quà")}: <b className="num"><XuAmount amount={Number(wallet.data?.greenGiftHeld)} currency="green"/></b></p>}
      </div>
      <div className="gift-wallet-actions"><XuExchange ctx={ctx} available={Number(wallet.data?.available || 0)} disabled={!balanceReady || redeeming !== null || uncertain !== null}/><Link href="/checkin">{t("Điểm danh nhận Xu xanh")}<ArrowUpRight size={15} aria-hidden="true"/></Link></div>
    </section>
    <aside className="gift-guide" aria-labelledby="gift-guide-title">
      <h2 id="gift-guide-title">{t("Từ Xu xanh đến quà của bạn")}</h2>
      <ol>
        <li><span aria-hidden="true">01</span><div><b>{t("Chọn quà yêu thích")}</b><p>{t("Xem giá Xu xanh và điều kiện sử dụng.")}</p></div></li>
        <li><span aria-hidden="true">02</span><div><b>{t("Gửi yêu cầu đổi quà")}</b><p>{t("Xu xanh được tạm giữ khi gửi yêu cầu.")}</p></div></li>
        <li><span aria-hidden="true">03</span><div><b>{t("Nhận mã trong lịch sử")}</b><p>{t("Mã voucher hiển thị khi yêu cầu hoàn tất.")}</p></div></li>
      </ol>
    </aside>
    </div>

    {success && <div className="gift-success" role="status"><Check size={19} aria-hidden="true"/><div><b>{t("Đã gửi yêu cầu đổi quà.")}</b><p>{success.name} · <XuAmount amount={success.cost} currency="green"/></p><p>{t("Xu xanh được tạm giữ trong lúc chờ cấp mã voucher.")}</p><Link href="/history?tab=gifts">{t("Xem yêu cầu trong Lịch sử")}</Link></div></div>}
    {uncertain && <div className="gift-uncertain"><div><b>{t("Chưa xác nhận được kết quả đổi quà.")}</b><p>{uncertain.name} · <XuAmount amount={uncertain.costXu} currency="green"/></p><p>{t("Kiểm tra lại yêu cầu trước khi đổi quà khác.")}</p></div><button className="btn sm ghost" disabled={redeeming !== null} onClick={() => void redeem(uncertain, true)}>{t(redeeming !== null ? "Đang kiểm tra…" : "Kiểm tra yêu cầu")}</button></div>}

    <section className="gift-catalog" aria-labelledby="gift-catalog-title">
      <div className="gift-catalog-heading"><div><div className="gift-catalog-title"><h2 id="gift-catalog-title">{t("Chọn quà của bạn")}</h2>{!catalog.isPending && !catalog.isError && <span className="gift-count num">{new Intl.NumberFormat(language).format(gifts.length)}</span>}</div><p>{t("Quà chỉ thanh toán bằng Xu xanh.")}</p></div><Link className="gift-history-link" href="/history?tab=gifts"><History size={17} aria-hidden="true"/>{t("Xem lịch sử đổi quà")}<ArrowUpRight size={15} aria-hidden="true"/></Link></div>
      {catalog.isPending ? <div className="gift-loading" role="status" aria-label={t("Đang tải quà…")}><div aria-hidden="true"/><div aria-hidden="true"/><div aria-hidden="true"/><div aria-hidden="true"/></div> : catalog.isError ? <div className="gift-empty" role="alert"><p>{t("Chưa tải được danh sách quà. Vui lòng thử lại.")}</p><button className="btn sm ghost" onClick={() => void catalog.refetch()}>{t("Thử lại")}</button></div> : gifts.length === 0 ? <div className="gift-empty"><Gift size={28} aria-hidden="true"/><p>{t("Chưa có quà để đổi. Bạn quay lại sau nhé.")}</p></div> : <ul className="gift-list">
        {gifts.map(gift => {
          const validCost = Number.isSafeInteger(gift.costXu) && gift.costXu > 0;
          const missing = balanceReady && validCost ? Math.max(0, gift.costXu - Number(available)) : 0;
          const unavailable = gift.stock < 1;
          const disabled = redeeming !== null || uncertain !== null || unavailable || !balanceReady || !validCost || missing > 0;
          const reason = unavailable ? t("Hết hàng") : !validCost ? t("Quà chưa sẵn sàng") : !balanceReady ? t("Cần tải số dư để đổi quà") : missing > 0 ? `${t("Còn thiếu")} ${new Intl.NumberFormat(language).format(missing)}` : "";
          return <li key={gift.id} className={`gift-item${unavailable ? " is-unavailable" : ""}`} data-gift-id={gift.id}>
            <div className="gift-item-visual"><span className="gift-format"><Ticket size={14} aria-hidden="true"/>{t("Voucher")}</span><GiftImage src={gift.imageUrl} name={gift.name} positionY={gift.imagePositionY}/><p className={`gift-stock${unavailable ? " is-empty" : ""}`}>{unavailable ? t("Hết hàng") : `${t("Còn")} ${new Intl.NumberFormat(language).format(gift.stock)} ${t("mã")}`}</p></div>
            <div className="gift-item-info"><h3>{gift.name}</h3><GiftDescription key={gift.description} text={gift.description}/></div>
            <div className="gift-item-action"><b className="gift-price num">{validCost ? <XuAmount amount={gift.costXu} currency="green"/> : "—"}</b><button className="btn sm" disabled={disabled} aria-busy={redeeming === gift.id} aria-describedby={reason ? `gift-reason-${gift.id}` : undefined} onClick={() => void redeem(gift)}>{t(redeeming === gift.id ? "Đang đổi…" : "Đổi voucher")}</button>{reason && <p id={`gift-reason-${gift.id}`} className="gift-reason">{missing > 0 && !unavailable && validCost && balanceReady ? <>{t("Còn thiếu")} <XuAmount amount={missing} currency="green"/></> : reason}</p>}</div>
          </li>;
        })}
      </ul>}
    </section>
  </section>;
}
