"use client";

import { useEffect, useState } from "react";
import { Package, RotateCw } from "lucide-react";
import { api, money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

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

export type ProductCheckState = { url: string; loading: boolean; product?: ProductCheck; error?: string };

export function ProductCommission({ url, onState }: { url: string; onState?: (state: ProductCheckState) => void }) {
  const { t } = useI18n();
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
          if (!controller.signal.aborted) setRequest({ url: currentURL, loading: false, error: error.message });
        });
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [currentURL, attempt]);

  useEffect(() => {
    onState?.(request.url === currentURL && isShopeeURL(currentURL) ? request : { url: currentURL, loading: isShopeeURL(currentURL) });
  }, [request, currentURL, onState]);

  if (!currentURL) return null;
  if (!isShopeeURL(currentURL)) return <p className="small mute">{t("Dán link sản phẩm Shopee hợp lệ để tự kiểm tra hoa hồng.")}</p>;
  if (request.url !== currentURL || request.loading)
    return <div className="note commission-loading" role="status"><Package size={20} aria-hidden="true" /><span>{t("Đang lấy thông tin sản phẩm và hoa hồng…")}</span></div>;
  if (request.error)
    return <div className="note error-note" role="alert">
      <p>{t(request.error)}</p>
      <button type="button" className="btn sm ghost" onClick={() => setAttempt((value) => value + 1)}>{t("Thử lại")}</button>
    </div>;

  const product = request.product;
  if (!product) return null;
  const verified = product.schemaVerified === true;
  return <section className="product-commission note" aria-label={t("Thông tin sản phẩm và hoa hồng")} aria-live="polite">
    <div className="commission-heading"><h3>{product.productName || t("Đã kiểm tra sản phẩm")}</h3><span className="commission-estimate">{t("Dự kiến")}</span></div>
    <p className="small mute">{t("Mã sản phẩm")}: {product.itemId} · {t("Mã shop")}: {product.shopId}</p>
    {verified ? <dl className="product-commission-details">
      {product.commission != null && <div className="commission-primary"><dt>{t("Hoa hồng dự kiến")}</dt><dd>{money(product.commission)}</dd></div>}
      {product.commissionRate != null && <div className="commission-rate"><dt>{t("Tỷ lệ hoa hồng")}</dt><dd>{product.commissionRate}%</dd></div>}
      {product.price != null && <div><dt>{t("Giá sản phẩm")}</dt><dd>{money(product.price)}</dd></div>}
      {product.sellerCommission != null && <div><dt>{t("Hoa hồng từ shop")}</dt><dd>{money(product.sellerCommission)}</dd></div>}
      {product.shopeeCommission != null && <div><dt>{t("Hoa hồng từ Shopee")}</dt><dd>{money(product.shopeeCommission)}</dd></div>}
      {product.commissionCap != null && <div><dt>{t("Giới hạn hoa hồng")}</dt><dd>{money(product.commissionCap)}</dd></div>}
    </dl> : <p className="small">{t("Thông tin hoa hồng tạm thời chưa sẵn sàng. Vui lòng thử lại sau.")}</p>}
    <p className="small mute">{t("Hoa hồng này là dự kiến từ sàn, không phải tiền hoàn đã duyệt hay số dư có thể rút.")}</p>
    <button type="button" className="btn sm ghost commission-refresh" onClick={() => setAttempt((value) => value + 1)}><RotateCw size={14} aria-hidden="true" />{t("Kiểm tra hoa hồng")}</button>
  </section>;
}
