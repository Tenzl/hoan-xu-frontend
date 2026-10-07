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
  const available = Number(data?.available || 0), pending = Number(data?.pending || 0), held = Number(data?.held || 0), giftHeld = Number(data?.giftHeld || 0);
  const canWithdraw = available >= MIN_WITHDRAWAL_XU && !(Number(data?.debt) > 0);
  const withdrawalProgress = Math.min(Math.max(available, 0), MIN_WITHDRAWAL_XU);
  const progressPercent = withdrawalProgress / MIN_WITHDRAWAL_XU * 100;
  const estimate = rewardEstimate(check?.loading || check?.error ? undefined : check?.product, membership, snapshot);
  const range = moneyRange(estimate.current, language);
  const pendingTotal = Math.max(available, 0) + Math.max(pending, 0);
  const toPercent = (value: number) => Math.min(Math.max(value, 0), MIN_WITHDRAWAL_XU) / MIN_WITHDRAWAL_XU * 100;
  const pendingEnd = toPercent(pendingTotal);
  const previewMinEnd = toPercent(pendingTotal + (estimate.current?.min || 0));
  const previewMaxEnd = toPercent(pendingTotal + (estimate.current?.max || 0));
  const projectedTotal = moneyRange({ min: pendingTotal + (estimate.current?.min || 0), max: pendingTotal + (estimate.current?.max || 0) }, language);
  return <aside className="link-wallet" aria-label={t("Ví Xu")}>
    <section className="wallet-card">
      <div className="wallet-card-heading"><span className="wallet-symbol"><Wallet size={18} /></span><h2>{t("Ví Xu")}</h2><span className="wallet-unit">{t("Số dư thật")}</span></div>
      {ctx.me?.role !== "customer" ? <div className="wallet-login"><ShieldCheck size={32} /><h3>{t("Ví của bạn, trong một nơi")}</h3><p>{t("Hoàn tiền và Xu điểm danh cùng tích lũy vào ví.")}</p><Link className="btn" href="/login">{t("Đăng nhập Google")}</Link></div> : dashboard.isPending ? <div className="wallet-skeleton" role="status" aria-label={t("Đang tải ví…")} /> : dashboard.isError ? <div className="wallet-login" role="alert"><p>{t("Chưa tải được ví của bạn.")}</p><button className="btn ghost" onClick={() => void dashboard.refetch()}>{t("Thử lại")}</button></div> : <>
        <figure ref={chart} className="wallet-chart" aria-label={t("Tiến độ đạt ngưỡng rút tiền")} onPointerEnter={event => { if (event.pointerType === "mouse") setDetailsHovered(true); }} onPointerLeave={() => setDetailsHovered(false)}>
          <div role="progressbar" aria-label={t("Tiến độ đạt ngưỡng rút tiền")} aria-valuemin={0} aria-valuemax={MIN_WITHDRAWAL_XU} aria-valuenow={withdrawalProgress} aria-valuetext={`${t("Khả dụng")}: ${number(available)} Xu · ${t("Rút từ 50.000 Xu khả dụng")}${Number(data?.debt) > 0 ? ` · ${t("Cần xử lý khoản thiếu trước khi rút.")}` : ""}`}>
            <svg viewBox="0 0 220 220" aria-hidden="true">
              <g transform="rotate(-90 110 110)">
                <circle cx="110" cy="110" r={76} className="wallet-ring-track" />
                {withdrawalProgress > 0 && <circle cx="110" cy="110" r={76} pathLength="100" strokeDasharray={`${progressPercent} ${100 - progressPercent}`} className={`wallet-withdraw-progress ${canWithdraw ? "wallet-available" : "wallet-pending"}`} />}
                {pendingEnd > progressPercent && <circle cx="110" cy="110" r={76} pathLength="100" strokeDasharray={`${pendingEnd - progressPercent} ${100 - (pendingEnd - progressPercent)}`} strokeDashoffset={-progressPercent} className="wallet-awaiting-progress" />}
                {previewMaxEnd > pendingEnd && <g className="wallet-preview-ring">
                  {previewMinEnd > pendingEnd && <circle cx="110" cy="110" r={76} pathLength="100" strokeDasharray={`${previewMinEnd - pendingEnd} ${100 - (previewMinEnd - pendingEnd)}`} strokeDashoffset={-pendingEnd} className="wallet-preview-min" />}
                  {previewMaxEnd > previewMinEnd && <circle cx="110" cy="110" r={76} pathLength="100" strokeDasharray={`${previewMaxEnd - previewMinEnd} ${100 - (previewMaxEnd - previewMinEnd)}`} strokeDashoffset={-previewMinEnd} className="wallet-preview-max" />}
                </g>}
              </g>
            </svg>
          </div>
          <figcaption><span>{t("Khả dụng")}</span><strong className="num">{number(available)}</strong><span>Xu</span></figcaption>
          <button type="button" className="wallet-chart-trigger" aria-label={t("Xem chi tiết tiến độ rút tiền")} aria-expanded={detailsVisible} aria-controls={detailID} onFocus={() => setDetailsHovered(true)} onBlur={() => setDetailsHovered(false)} onClick={() => { setDetailsOpen(value => !value); setDetailsHovered(false); }} />
          <div id={detailID} className="wallet-progress-detail" hidden={!detailsVisible}>
            <strong>{t("Tiến độ rút tiền")}</strong>
            <dl>
              <div><dt>{t("Khả dụng")}</dt><dd>{number(available)} Xu</dd></div>
              <div><dt>{t("Chờ duyệt")}</dt><dd>{number(pending)} Xu</dd></div>
              <div><dt>{t("Dự kiến từ sản phẩm")}</dt><dd>{range || "—"}</dd></div>
              <div><dt>{t("Nếu tất cả được duyệt")}</dt><dd>{projectedTotal}</dd></div>
            </dl>
            <p>{t("Phần dự kiến chưa thể rút.")}</p>
          </div>
        </figure>
        <dl className="wallet-legend">
          {[ ["Chờ duyệt", pending, "pending"], ["Đang chờ rút / đổi quà", held + giftHeld, "held"] ].map(([label, value, key]) => <div key={key}><dt><i className={`wallet-dot ${key}`} />{t(String(label))}</dt><dd className="num">{number(Number(value))} Xu</dd></div>)}
        </dl>
        {(held > 0 || giftHeld > 0) && <p className="wallet-hold-detail">{t("Rút tiền")}: {number(held)} Xu · {t("Đổi quà")}: {number(giftHeld)} Xu</p>}
        {Number(data?.debt) > 0 && <p className="err">{t("Khoản thiếu")}: {number(Number(data?.debt))} Xu</p>}
        <div className="wallet-order-stats">
          {[["Tổng đơn", data?.totalOrders], ["Chờ duyệt", data?.pendingOrders], ["Đã duyệt", data?.approvedOrders]].map(([label, value]) => <div key={String(label)}><b className="num">{number(Number(value || 0))}</b><span>{t(String(label))}</span></div>)}
        </div>
        <button ref={trigger} className="btn wallet-withdraw" disabled={!canWithdraw} onClick={() => setWithdraw(true)}>{t("Rút tiền")}<ArrowUpRight size={16} /></button>
        {available < MIN_WITHDRAWAL_XU && <p className="wallet-withdraw-hint">{t("Rút từ 50.000 Xu khả dụng")}</p>}
        <Link className="wallet-history" href="/history">{t("Xem lịch sử ví")}<ArrowUpRight size={13} /></Link>
      </>}
    </section>
    {ctx.me?.role === "customer" && !dashboard.isError && membership && <section className="link-membership wallet-membership reward-wallet-membership">
      <div className="reward-wallet-tier"><span>{t("Hạng của bạn")}</span><TierBadge code={membership.tierCode} /></div>
      <TierBenefits membership={{ ...membership, approvedOrders: data?.approvedOrders ?? membership.approvedOrders }} next={estimate.next} compact />
    </section>}
    {withdraw && <Modal title={t("Rút tiền về ngân hàng")} onClose={close}><WithdrawalForm ctx={ctx} available={available} debt={Number(data?.debt || 0)} onSuccess={close} /></Modal>}
  </aside>;
}
