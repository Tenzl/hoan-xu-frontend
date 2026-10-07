"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Check, Gift, History } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import type { AppContext } from "./app-context";
import { xu } from "./leaderboard";

type CatalogGift = components["schemas"]["Gift"];
type Wallet = components["schemas"]["Wallet"];
const channels = { shopee: "Shopee", lazada: "Lazada", tiktok: "TikTok", tiki: "Tiki" };

export function GiftShop({ ctx }: { ctx: AppContext }) {
  const { t, language } = useI18n();
  const wallet = useQuery({ queryKey: ["/wallet"], queryFn: () => api<Wallet>("/wallet"), refetchInterval: 15000 });
  const catalog = useQuery({ queryKey: ["/gifts"], queryFn: () => api<CatalogGift[]>("/gifts"), refetchInterval: 15000 });
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const sending = useRef(false);
  const [success, setSuccess] = useState<{ name: string; cost: number } | null>(null);
  const [uncertain, setUncertain] = useState<CatalogGift | null>(null);
  const available = wallet.data?.available;
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
    <header className="gift-wallet">
      <div className="gift-wallet-main">
        <span>{t("Xu có thể dùng")}</span>
        <strong className="num" aria-live="polite">{balanceReady ? xu(Number(available), language) : "—"}</strong>
        {wallet.isPending && <p role="status">{t("Đang tải số dư…")}</p>}
        {!wallet.isPending && !balanceReady && <div className="gift-wallet-error" role="alert"><p>{t("Chưa tải được số dư. Vui lòng thử lại.")}</p><button className="btn sm ghost" onClick={() => void wallet.refetch()}>{t("Thử lại số dư")}</button></div>}
        {balanceReady && Number(wallet.data?.giftHeld) > 0 && <p>{t("Đang chờ đổi quà")}: <b className="num">{xu(Number(wallet.data?.giftHeld), language)}</b></p>}
      </div>
      <Link className="gift-history-link" href="/history?tab=gifts"><History size={17} aria-hidden="true"/>{t("Xem lịch sử đổi quà")}<ArrowUpRight size={16} aria-hidden="true"/></Link>
    </header>

    {success && <div className="gift-success" role="status"><Check size={19} aria-hidden="true"/><div><b>{t("Đã gửi yêu cầu đổi quà.")}</b><p>{success.name} · {xu(success.cost, language)}</p><p>{t("Xu được tạm giữ trong lúc chờ cấp mã voucher.")}</p><Link href="/history?tab=gifts">{t("Xem yêu cầu trong Lịch sử")}</Link></div></div>}
    {uncertain && <div className="gift-uncertain"><div><b>{t("Chưa xác nhận được kết quả đổi quà.")}</b><p>{uncertain.name} · {xu(uncertain.costXu, language)}</p><p>{t("Kiểm tra lại yêu cầu trước khi đổi quà khác.")}</p></div><button className="btn sm ghost" disabled={redeeming !== null} onClick={() => void redeem(uncertain, true)}>{t(redeeming !== null ? "Đang kiểm tra…" : "Kiểm tra yêu cầu")}</button></div>}

    <section className="gift-catalog" aria-labelledby="gift-catalog-title">
      <div className="gift-catalog-heading"><h2 id="gift-catalog-title">{t("Chọn quà của bạn")}</h2><span>{t("Voucher")}</span></div>
      {catalog.isPending ? <div className="gift-loading" role="status" aria-label={t("Đang tải quà…")}><div aria-hidden="true"/><div aria-hidden="true"/></div> : catalog.isError ? <div className="gift-empty" role="alert"><p>{t("Chưa tải được danh sách quà. Vui lòng thử lại.")}</p><button className="btn sm ghost" onClick={() => void catalog.refetch()}>{t("Thử lại")}</button></div> : gifts.length === 0 ? <div className="gift-empty"><Gift size={28} aria-hidden="true"/><p>{t("Chưa có quà để đổi. Bạn quay lại sau nhé.")}</p></div> : <ul className="gift-list">
        {gifts.map(gift => {
          const validCost = Number.isSafeInteger(gift.costXu) && gift.costXu > 0;
          const missing = balanceReady && validCost ? Math.max(0, gift.costXu - Number(available)) : 0;
          const unavailable = gift.stock < 1;
          const disabled = redeeming !== null || uncertain !== null || unavailable || !balanceReady || !validCost || missing > 0;
          const reason = unavailable ? t("Tạm hết quà") : !validCost ? t("Quà chưa sẵn sàng") : !balanceReady ? t("Cần tải số dư để đổi quà") : missing > 0 ? `${t("Còn thiếu")} ${xu(missing, language)}` : "";
          return <li key={gift.id} className="gift-item" data-gift-id={gift.id}>
            <span className={`logo ${gift.channel}`} aria-hidden="true">{channels[gift.channel]?.slice(0, 2)}</span>
            <div className="gift-item-info"><span className="gift-channel">{channels[gift.channel]}</span><h3>{gift.name}</h3><p className="gift-stock">{unavailable ? t("Tạm hết quà") : `${t("Còn")} ${new Intl.NumberFormat(language).format(gift.stock)} ${t("mã")}`}</p></div>
            <div className="gift-item-action"><b className="gift-price num">{validCost ? xu(gift.costXu, language) : "—"}</b><button className="btn sm" disabled={disabled} aria-busy={redeeming === gift.id} aria-describedby={reason ? `gift-reason-${gift.id}` : undefined} onClick={() => void redeem(gift)}>{t(redeeming === gift.id ? "Đang đổi…" : "Đổi voucher")}</button>{reason && <p id={`gift-reason-${gift.id}`} className="gift-reason">{reason}</p>}</div>
          </li>;
        })}
      </ul>}
    </section>
  </section>;
}
