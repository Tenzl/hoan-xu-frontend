"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight, Wallet, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { shareRange, tierName } from "@/lib/cashback";
import { expectedXu } from "@/lib/wallet-preview";
import type { AppContext } from "./hoanxu";
import type { ProductCheckState } from "./product-commission";
import { Modal, type Data } from "./ui";
import { WithdrawalForm } from "./withdrawal-form";

type Query = { data?: Data; isPending: boolean; isError: boolean; refetch: () => unknown };
function Ring({ values, radius, classes }: { values: number[]; radius: number; classes: string[] }) {
  const sum = values.reduce((a, b) => a + b, 0);
  let offset = 0;
  return <g transform="rotate(-90 110 110)">
    <circle cx="110" cy="110" r={radius} className="wallet-ring-track" />
    {sum > 0 && values.map((v, i) => { const size = v / sum * 100; const start = offset; offset += size;
      return v > 0 ? <circle key={i} cx="110" cy="110" r={radius} pathLength="100" strokeDasharray={`${size} ${100 - size}`} strokeDashoffset={-start} className={classes[i]} /> : null;
    })}
  </g>;
}
export function LinkWallet({ ctx, dashboard, check, snapshot }: { ctx: AppContext; dashboard: Query; check?: ProductCheckState; snapshot?: Data | null }) {
  const { t, language } = useI18n();
  const [withdraw, setWithdraw] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const number = (v: number) => v.toLocaleString(language === "en" ? "en-US" : "vi-VN");
  const close = () => { setWithdraw(false); requestAnimationFrame(() => trigger.current?.focus()); };
  const data = dashboard.data;
  const membership = data?.membership;
  const policy = snapshot || membership;
  const available = Number(data?.available || 0), pending = Number(data?.pending || 0), held = Number(data?.held || 0), giftHeld = Number(data?.giftHeld || 0);
  const base = available + pending + held + giftHeld;
  const preview = !check?.loading && check?.product?.schemaVerified && policy ? expectedXu(check.product.commission, Number(policy.minSharePercent), Number(policy.maxSharePercent)) : null;
  const amount = preview ? `+${number(preview.min)}${preview.min === preview.max ? "" : "–" + number(preview.max)} Xu` : "";
  return <aside className="link-wallet" aria-label={t("Ví Xu")}>
    <section className="wallet-card">
      <div className="wallet-card-heading"><span className="wallet-symbol"><Wallet size={18} /></span><h2>{t("Ví Xu")}</h2><span className="wallet-unit">{t("1 Xu = 1đ")}</span></div>
      {ctx.me?.role !== "customer" ? <div className="wallet-login"><ShieldCheck size={32} /><h3>{t("Ví của bạn, trong một nơi")}</h3><p>{t("Hoàn tiền và Xu điểm danh cùng tích lũy vào ví.")}</p><Link className="btn" href="/login">{t("Đăng nhập Google")}</Link></div> : dashboard.isPending ? <div className="wallet-skeleton" role="status" aria-label={t("Đang tải ví…")} /> : dashboard.isError ? <div className="wallet-login" role="alert"><p>{t("Chưa tải được ví của bạn.")}</p><button className="btn ghost" onClick={() => void dashboard.refetch()}>{t("Thử lại")}</button></div> : <>
        <figure className="wallet-chart" aria-label={t("Phân bổ Xu trong ví")}>
          <svg viewBox="0 0 220 220" aria-hidden="true">
            <Ring radius={76} values={[available, pending, held + giftHeld]} classes={["wallet-available", "wallet-pending", "wallet-held"]} />
            {preview && preview.max > 0 && <g className="wallet-preview-ring"><Ring radius={96} values={[base, preview.min, preview.max - preview.min]} classes={["wallet-preview-base", "wallet-preview-min", "wallet-preview-max"]} /></g>}
          </svg>
          <figcaption><span>{t("Khả dụng")}</span><strong className="num">{number(available)}</strong><span>Xu</span></figcaption>
        </figure>
        <dl className="wallet-legend">
          {[ ["Khả dụng", available, "available"], ["Chờ duyệt", pending, "pending"], ["Tạm giữ", held + giftHeld, "held"] ].map(([label, value, key]) => <div key={key}><dt><i className={`wallet-dot ${key}`} />{t(String(label))}</dt><dd className="num">{number(Number(value))} Xu</dd></div>)}
        </dl>
        {(held > 0 || giftHeld > 0) && <p className="wallet-hold-detail">{t("Rút tiền")}: {number(held)} Xu · {t("Đổi quà")}: {number(giftHeld)} Xu</p>}
        {Number(data?.debt) > 0 && <p className="err">{t("Khoản thiếu")}: {number(Number(data?.debt))} Xu</p>}
        <div className="wallet-product-preview" aria-live="polite" aria-atomic="true">
          {check?.loading ? <div className="wallet-preview-skeleton" role="status">{t("Đang tính Xu dự kiến…")}</div> : preview ? <><span>{t("Đơn này có thể nhận")}</span><strong className="num">{amount}</strong><small>{t("Dự kiến nếu đơn được duyệt")}</small></> : <p>{t("Dán link để xem khoảng Xu có thể nhận.")}</p>}
        </div>
        <div className="wallet-order-stats">
          {[["Tổng đơn", data?.totalOrders], ["Chờ duyệt", data?.pendingOrders], ["Đã duyệt", data?.approvedOrders]].map(([label, value]) => <div key={String(label)}><b className="num">{number(Number(value || 0))}</b><span>{t(String(label))}</span></div>)}
        </div>
        <button ref={trigger} className="btn wallet-withdraw" disabled={available < 50000 || Number(data?.debt) > 0} onClick={() => setWithdraw(true)}>{t("Rút tiền")}<ArrowUpRight size={16} /></button>
        {available < 50000 && <p className="wallet-withdraw-hint">{t("Rút từ 50.000 Xu khả dụng")}</p>}
        <Link className="wallet-history" href="/wallet">{t("Xem lịch sử ví")}<ArrowUpRight size={13} /></Link>
      </>}
    </section>
    {ctx.me?.role === "customer" && membership && <section className="link-membership wallet-membership">
      <div className="row between"><span className="link-tier">{t(tierName(membership.tierCode))}</span><b className="link-share num">{shareRange(membership.minSharePercent, membership.maxSharePercent)}</b></div>
      <p>{t("Khoảng chia dự kiến trên hoa hồng sàn thực nhận.")}</p>
      {membership.nextTier && <progress className="wallet-tier-progress" aria-label={t("Tiến độ lên hạng")} max={Math.max(1, Number(membership.nextTier.minApprovedOrders ?? (Number(data?.approvedOrders || 0) + Number(membership.ordersToNext || 0))) - Number(membership.minApprovedOrders || 0))} value={Math.max(0, Number(data?.approvedOrders || 0) - Number(membership.minApprovedOrders || 0))} />}
      {membership.nextTier && <p className="small">{t("Còn")} {number(Number(membership.ordersToNext || 0))} {t("đơn đã duyệt để lên hạng")} {t(tierName(membership.nextTier.tierCode))}</p>}
      <div className="link-membership-foot"><ShieldCheck size={14} /><span>{t("Tiền hoàn được duyệt sau đối soát.")}</span></div>
    </section>}
    {withdraw && <Modal title={t("Rút tiền về ngân hàng")} onClose={close}><WithdrawalForm ctx={ctx} available={available} debt={Number(data?.debt || 0)} onSuccess={close} /></Modal>}
  </aside>;
}
