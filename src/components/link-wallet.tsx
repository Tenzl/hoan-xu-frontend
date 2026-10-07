"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRight, Wallet, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { rewardEstimate, moneyRange, type RewardSnapshot } from "@/lib/wallet-preview";
import type { ProductCheckState } from "./product-commission";
import type { AppContext } from "./hoanxu";
import { Modal, type Data } from "./ui";
import { WithdrawalForm } from "./withdrawal-form";
import { XuAmount } from "./xu-amount";
import { TierBadge, TierBenefits } from "./tier-benefits";

type Query = { data?: Data; isPending: boolean; isError: boolean; refetch: () => unknown };
const MIN_WITHDRAWAL_XU = 50000;
export function LinkWallet({ ctx, dashboard, check, snapshot }: { ctx: AppContext; dashboard: Query; check?: ProductCheckState; snapshot?: RewardSnapshot | null }) {
  const { t, language } = useI18n();
  const [withdraw, setWithdraw] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsHovered, setDetailsHovered] = useState(false);
  const detailID = useId();
  const detailsVisible = detailsOpen || detailsHovered;
  const chart = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!detailsVisible) return;
    const dismiss = () => { setDetailsOpen(false); setDetailsHovered(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    const onOutside = (event: PointerEvent) => { if (!chart.current?.contains(event.target as Node)) dismiss(); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onOutside); };
  }, [detailsVisible]);
  const trigger = useRef<HTMLButtonElement>(null);
  const number = (v: number) => v.toLocaleString(language === "en" ? "en-US" : "vi-VN");
  const close = () => { setWithdraw(false); requestAnimationFrame(() => trigger.current?.focus()); };
  const data = dashboard.data;
  const membership = data?.membership;
  const available = Number(data?.available || 0), pending = Number(data?.pending || 0), held = Number(data?.held || 0);
  const canWithdraw = available >= MIN_WITHDRAWAL_XU && !(Number(data?.debt) > 0);
  const withdrawalProgress = Math.min(Math.max(available, 0), MIN_WITHDRAWAL_XU);
  const progressPercent = withdrawalProgress / MIN_WITHDRAWAL_XU * 100;
  const estimate = rewardEstimate(check?.loading || check?.error ? undefined : check?.product, membership, snapshot);
  const range = moneyRange(estimate.current, language);
  return <aside className="link-wallet" aria-label={t("Ví Xu vàng")}>
    <section className="wallet-card">
      <div className="wallet-card-heading"><span className="wallet-symbol"><Wallet size={18} /></span><h2>{t("Ví Xu vàng")}</h2><span className="wallet-unit">{t("Số dư thật")}</span></div>
      {ctx.me?.role !== "customer" ? <div className="wallet-login"><ShieldCheck size={32} /><h3>{t("Ví của bạn, trong một nơi")}</h3><p>{t("Hoàn tiền nhận Xu vàng; điểm danh nhận Xu xanh.")}</p><Link className="btn" href="/login">{t("Đăng nhập Google")}</Link></div> : dashboard.isPending ? <div className="wallet-skeleton" role="status" aria-label={t("Đang tải ví…")} /> : dashboard.isError ? <div className="wallet-login" role="alert"><p>{t("Chưa tải được ví của bạn.")}</p><button className="btn ghost" onClick={() => void dashboard.refetch()}>{t("Thử lại")}</button></div> : <>
        <figure ref={chart} className="wallet-chart" aria-label={t("Tiến độ đạt ngưỡng rút tiền")} onPointerEnter={event => { if (event.pointerType === "mouse") setDetailsHovered(true); }} onPointerLeave={() => setDetailsHovered(false)}>
          <div role="progressbar" aria-label={t("Tiến độ đạt ngưỡng rút tiền")} aria-valuemin={0} aria-valuemax={MIN_WITHDRAWAL_XU} aria-valuenow={withdrawalProgress} aria-valuetext={`${t("Khả dụng")}: ${number(available)} Xu · ${t("Rút từ 50.000 Xu khả dụng")}${Number(data?.debt) > 0 ? ` · ${t("Cần xử lý khoản thiếu trước khi rút.")}` : ""}`}>
            <svg viewBox="0 0 220 220" aria-hidden="true">
              <g transform="rotate(-90 110 110)">
                <circle cx="110" cy="110" r={76} className="wallet-ring-track" />
                {withdrawalProgress > 0 && <circle cx="110" cy="110" r={76} pathLength="100" strokeDasharray={`${progressPercent} ${100 - progressPercent}`} className={`wallet-withdraw-progress ${canWithdraw ? "wallet-available" : "wallet-pending"}`} />}

              </g>
            </svg>
          </div>
          <figcaption><span>{t("Khả dụng")}</span><strong className="num">{number(available)}</strong><span>{t("Xu vàng")}</span></figcaption>
          <button type="button" className="wallet-chart-trigger" aria-label={t("Xem chi tiết tiến độ rút tiền")} aria-expanded={detailsVisible} aria-controls={detailID} onFocus={() => setDetailsHovered(true)} onBlur={() => setDetailsHovered(false)} onClick={() => { setDetailsOpen(value => !value); setDetailsHovered(false); }} />
          <div id={detailID} className="wallet-progress-detail" hidden={!detailsVisible}>
            <strong>{t("Tiến độ rút tiền")}</strong>
            <dl>
              <div><dt>{t("Khả dụng")}</dt><dd><XuAmount amount={available}/></dd></div>
              <div><dt>{t("Chờ duyệt")}</dt><dd><XuAmount amount={pending}/></dd></div>
              <div><dt>{t("Dự kiến từ sản phẩm")}</dt><dd>{range || "—"}</dd></div>
            </dl>
            <p>{t("Phần dự kiến chưa thể rút.")}</p>
          </div>
        </figure>
        <dl className="wallet-legend">
          {[ ["Đã sử dụng", Number(data?.goldUsed || 0), "held"], ["Chờ duyệt", pending, "pending"], ["Đang chờ rút tiền", held, "held"] ].map(([label, value, key]) => <div key={String(label)}><dt><i className={`wallet-dot ${key}`} />{t(String(label))}</dt><dd className="num"><XuAmount amount={Number(value)}/></dd></div>)}
        </dl>
        {Number(data?.debt) > 0 && <p className="err">{t("Khoản thiếu")}: <XuAmount amount={Number(data?.debt)}/></p>}
        <div className="wallet-order-stats">
          {[["Tổng đơn", data?.totalOrders], ["Chờ duyệt", data?.pendingOrders], ["Đã duyệt", data?.approvedOrders]].map(([label, value]) => <div key={String(label)}><b className="num">{number(Number(value || 0))}</b><span>{t(String(label))}</span></div>)}
        </div>
        <button ref={trigger} className="btn wallet-withdraw" disabled={!canWithdraw} onClick={() => setWithdraw(true)}>{t("Rút tiền")}<ArrowUpRight size={16} /></button>
        <Link className="btn ghost wallet-exchange" href="/wallet?exchange=1">{t("Đổi xu")}<ArrowUpRight size={16} /></Link>
        <Link className="wallet-history" href="/history">{t("Xem lịch sử ví")}<ArrowUpRight size={13} /></Link>
      </>}
    </section>
    {ctx.me?.role === "customer" && !dashboard.isError && membership && <section className="link-membership wallet-membership reward-wallet-membership">
      <div className="reward-wallet-tier"><span>{t("Hạng của bạn")}</span><TierBadge code={membership.tierCode} nameVi={membership.nameVi} nameEn={membership.nameEn} /></div>
      <TierBenefits membership={{ ...membership, approvedOrders: data?.approvedOrders ?? membership.approvedOrders }} next={estimate.next} compact />
    </section>}
    {withdraw && <Modal title={t("Rút tiền về ngân hàng")} onClose={close}><WithdrawalForm ctx={ctx} available={available} debt={Number(data?.debt || 0)} onSuccess={close} /></Modal>}
  </aside>;
}
