"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, RotateCw, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { checkerErrorMessage } from "@/lib/checker-errors";
import { useI18n } from "@/lib/i18n";
import { rewardEstimate, moneyRange, type RewardMembership, type RewardSnapshot } from "@/lib/wallet-preview";
import { TierBadge, TierBenefits } from "./tier-benefits";

export type ProductCheck = {
  itemId: string;
  shopId: string;
  schemaVerified: boolean;
  productName?: string;
  price?: number;
  commission?: number;
  commissionRate?: number;
  sellerCommission?: number;
  shopeeCommission?: number;
  commissionCap?: number | null;
};

function isShopeeURL(value: string) {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && ["shopee.vn", "www.shopee.vn", "s.shopee.vn", "affiliate.shopee.vn"].includes(url.hostname)
      && url.pathname !== "/";
  } catch {
    return false;
  }
}

export type ProductCheckState = { url: string; loading: boolean; product?: ProductCheck; error?: string; errorCode?: string };

export function ProductCommission({ url, onState, membership, snapshot, customer = false, membershipLoading = false, membershipError = false, onRetryMembership }: {
  url: string; onState?: (state: ProductCheckState) => void;
  membership?: RewardMembership; snapshot?: RewardSnapshot | null;
  customer?: boolean; membershipLoading?: boolean; membershipError?: boolean; onRetryMembership?: () => void;
}) {
  const { t, language } = useI18n();
  const currentURL = url.trim();
  const [attempt, setAttempt] = useState(0);
  const [request, setRequest] = useState<ProductCheckState>({ url: "", loading: false });
  useEffect(() => {
    if (!isShopeeURL(currentURL)) return;
    const controller = new AbortController();
    setRequest({ url: currentURL, loading: true });
    const timer = setTimeout(() => {
      void api<ProductCheck>("/product-checks", "POST", { url: currentURL }, undefined, controller.signal)
        .then((product) => {
          if (!controller.signal.aborted) setRequest({ url: currentURL, loading: false, product });
        })
        .catch((error: Error) => {
          if (!controller.signal.aborted) setRequest({ url: currentURL, loading: false, error: error.message, errorCode: error instanceof ApiError ? error.code : undefined });
        });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [currentURL, attempt]);

  useEffect(() => {
    onState?.(request.url === currentURL && isShopeeURL(currentURL) ? request : { url: currentURL, loading: isShopeeURL(currentURL) });
  }, [request, currentURL, onState]);

  if (!currentURL) return null;
  if (!isShopeeURL(currentURL)) return <p className="small mute">{t("Dán link món bạn thích trên Shopee để xem tiền hoàn dự kiến.")}</p>;
  if (request.url !== currentURL || request.loading)
    return <div className="note commission-loading reward-loading" role="status"><Package size={20} aria-hidden="true" /><div><span>{t("Đang kiểm tra sản phẩm…")}</span><div className="reward-loading-bar" /></div></div>;
  if (request.error)
    return <div className="note error-note" role="alert">
      <p>{t(checkerErrorMessage(request.errorCode, request.error))}</p>
      <button type="button" className="btn sm ghost" onClick={() => setAttempt((value) => value + 1)}>{t("Thử lại")}</button>
    </div>;

  const product = request.product;
  if (!product) return null;
  const preview = rewardEstimate(product, membership, snapshot);
  const range = moneyRange(preview.current, language);
  return <section className="product-commission reward-product" aria-label={t("Sản phẩm và khoảng nhận")} aria-live="polite">
    <div className="reward-product-heading">
      <span className="reward-product-icon" aria-hidden="true"><Package size={20} strokeWidth={1.6} /></span>
      <div><h3>{product.productName || t("Sản phẩm của bạn")}</h3>{product.price != null && <p className="reward-product-price">{t("Giá sản phẩm")} <b className="num">{Number(product.price).toLocaleString(language === "en" ? "en-US" : "vi-VN")}{language === "en" ? "₫" : "đ"}</b></p>}</div>
      <button type="button" className="reward-refresh" aria-label={t("Kiểm tra lại sản phẩm")} title={t("Kiểm tra lại sản phẩm")} onClick={() => setAttempt((value) => value + 1)}><RotateCw size={15} aria-hidden="true" /></button>
    </div>
    {!customer ? <div className="reward-login"><p>{t("Đăng nhập để khám phá quyền lợi mua sắm của bạn.")}</p><Link href="/login">{t("Đăng nhập Google")}</Link></div> : membershipLoading ? <div className="reward-loading-state" role="status">{t("Đang tải quyền lợi của bạn…")}</div> : membershipError || !membership ? <div className="reward-unavailable"><p>{t("Chưa tải được quyền lợi của bạn.")}</p>{onRetryMembership && <button type="button" className="btn sm ghost" onClick={onRetryMembership}>{t("Thử lại")}</button>}</div> : <>
      <div className="reward-main">
        <div className="reward-main-heading"><span>{t("Tiền hoàn của bạn")}</span><div className="reward-current-tier"><small>{t("Hạng của bạn")}</small><TierBadge code={membership.tierCode} /></div></div>
        {range ? <div className="reward-amount num"><strong>{range}</strong></div> : <p className="reward-unavailable">{t("Chưa xem được tiền hoàn cho món này. Bạn thử lại nhé.")}</p>}
        {range && <p className="reward-promise">{t("Tiền hoàn dự kiến")}</p>}
        {!product.schemaVerified && <p className="reward-promise">{t("Chưa xác nhận được thông tin món này. Bạn thử lại nhé.")}</p>}
        {preview.snapshotChanged && <p className="reward-snapshot">{t("Khoảng áp dụng cho link này")} · <TierBadge code={snapshot!.tierCode} /></p>}
      </div>
      <TierBenefits membership={membership} next={preview.next} />
      <p className="reward-footnote"><ShieldCheck size={13} aria-hidden="true" />{t("Mua món mê say, tích Xu mỗi ngày.")}</p>
    </>}
  </section>;
}
