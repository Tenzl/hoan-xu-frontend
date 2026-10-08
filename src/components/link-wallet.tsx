"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowUpRight, ArrowRightLeft, Coins, Gift, Leaf, RefreshCw, ShieldCheck, Wallet, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { rewardEstimate, moneyRange, type RewardSnapshot } from "@/lib/wallet-preview";
import type { ProductCheckState } from "./product-commission";
import type { AppContext } from "./hoanxu";
import { Modal, type Data } from "./ui";
import { WithdrawalForm } from "./withdrawal-form";
import { XuAmount } from "./xu-amount";
import { TierBadge, TierBenefits } from "./tier-benefits";
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { WalletWeeklySummary } from "./wallet-weekly-summary";

type Query = { data?: Data; isPending: boolean; isError: boolean; isFetching?: boolean; refetch: () => unknown };
const MIN_WITHDRAWAL_XU = 50000;

export function LinkWallet({ ctx, dashboard, check, snapshot }: { ctx: AppContext; dashboard: Query; check?: ProductCheckState; snapshot?: RewardSnapshot | null }) {
  const { t, language } = useI18n();
  const [withdraw, setWithdraw] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const customer = ctx.me?.role === "customer";
  const data = dashboard.data;
  const membership = data?.membership;
  const available = Number(data?.available || 0);
  const pending = Number(data?.pending || 0);
  const held = Number(data?.held || 0);
  const debt = Number(data?.debt || 0);
  const greenAvailable = Number(data?.greenAvailable || 0);
  const canWithdraw = !dashboard.isPending && !dashboard.isError && available >= MIN_WITHDRAWAL_XU && debt <= 0;
  const progress = Math.min(Math.max(available, 0), MIN_WITHDRAWAL_XU);
  const missing = Math.max(0, MIN_WITHDRAWAL_XU - available);
  const estimate = rewardEstimate(check?.loading || check?.error ? undefined : check?.product, membership, snapshot);
  const range = moneyRange(estimate.current, language);
  const number = (value: number) => value.toLocaleString(language === "en" ? "en-US" : "vi-VN");
  const close = () => { setWithdraw(false); requestAnimationFrame(() => trigger.current?.focus()); };
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await dashboard.refetch(); } finally { setRefreshing(false); }
  };

  return <aside className="link-wallet wallet-summary" aria-label={t("Ví của tôi")}>
    <Card className="wallet-summary-card">
      <CardHeader>
        <CardTitle><h2 className="wallet-summary-title"><Wallet size={18} aria-hidden="true" />{t("Ví của tôi")}</h2></CardTitle>
        <CardDescription>{t("Số dư thật")}</CardDescription>
        {customer && <CardAction><Button type="button" variant="ghost" size="icon" aria-label={t("Tải lại số dư ví")} disabled={refreshing || dashboard.isFetching || dashboard.isPending} aria-busy={refreshing || dashboard.isFetching} onClick={() => void refresh()}><RefreshCw aria-hidden="true" /></Button></CardAction>}
      </CardHeader>
      <CardContent className="wallet-summary-content">
        {!customer ? <div className="wallet-login"><ShieldCheck size={28} aria-hidden="true" /><h3>{t("Ví của bạn, trong một nơi")}</h3><p>{t("Hoàn tiền nhận Xu vàng; điểm danh nhận Xu xanh.")}</p><Button asChild><Link href="/login">{t("Đăng nhập Google")}</Link></Button></div>
          : dashboard.isPending ? <div className="wallet-summary-loading" role="status" aria-label={t("Đang tải ví…")}><Skeleton className="wallet-loading-gold" /><Skeleton className="wallet-loading-green" /><Skeleton className="wallet-loading-actions" /><Skeleton className="wallet-loading-week" /></div>
          : dashboard.isError && !data ? <div className="wallet-login" role="alert"><p>{t("Chưa tải được ví của bạn.")}</p><Button variant="outline" onClick={() => void refresh()} disabled={refreshing}>{t("Thử lại")}</Button></div>
          : <>
            {dashboard.isError && <p className="wallet-inline-error" role="alert">{t("Chưa cập nhật được số dư. Tải lại trước khi rút tiền.")}</p>}
            <section className="wallet-balance-gold" aria-label={t("Ví Xu vàng")}>
              <div className="wallet-balance-label"><span><Coins size={15} aria-hidden="true" />{t("Xu vàng")}</span><span>{t("Khả dụng")}</span></div>
              <strong className="wallet-balance-value num">{number(available)}<small>Xu</small></strong>
              <progress className="wallet-withdrawal-progress" aria-label={t("Tiến độ đạt ngưỡng rút tiền")} aria-valuemin={0} aria-valuemax={MIN_WITHDRAWAL_XU} aria-valuenow={progress} aria-valuetext={`${number(available)} / ${number(MIN_WITHDRAWAL_XU)} Xu`} max={MIN_WITHDRAWAL_XU} value={progress} />
              <p className="wallet-balance-hint">{debt > 0 ? t("Cần xử lý khoản thiếu trước khi rút.") : missing > 0 ? <>{t("Còn")} <b className="num">{number(missing)} Xu</b> {t("để đạt ngưỡng rút tiền")}</> : t("Đã đủ ngưỡng rút tiền")}</p>
            </section>
            <section className="wallet-balance-green" aria-label={t("Ví Xu xanh")}>
              <div><span className="wallet-balance-label"><Leaf size={15} aria-hidden="true" />{t("Xu xanh")}</span><strong className="wallet-green-amount num">{number(greenAvailable)}<small>Xu</small></strong><p>{t("Dùng đổi quà")}</p></div>
              <Button asChild variant="outline" size="sm"><Link href="/gift">{t("Đổi quà")}<Gift aria-hidden="true" /></Link></Button>
            </section>
            <div className="wallet-summary-actions">
              <Button ref={trigger} className="wallet-summary-withdraw" disabled={!canWithdraw} onClick={() => setWithdraw(true)}>{t("Rút tiền")}<ArrowUpRight aria-hidden="true" /></Button>
              <Button asChild variant="outline"><Link href="/wallet?exchange=1">{t("Đổi xu")}<ArrowRightLeft aria-hidden="true" /></Link></Button>
            </div>
            <details className="wallet-summary-details">
              <summary>{t("Chi tiết số dư")}<ChevronDown size={14} aria-hidden="true" /></summary>
              <dl className="wallet-summary-breakdown">
                <div><dt>{t("Chờ duyệt")}</dt><dd><XuAmount amount={pending} /></dd></div>
                <div><dt>{t("Đang chờ rút tiền")}</dt><dd><XuAmount amount={held} /></dd></div>
                <div><dt>{t("Đã sử dụng")}</dt><dd><XuAmount amount={Number(data?.goldUsed || 0)} /></dd></div>
                <div><dt>{t("Giữ Xu xanh đổi quà")}</dt><dd><XuAmount amount={Number(data?.greenGiftHeld || 0)} currency="green" /></dd></div>
                {debt > 0 && <div className="err"><dt>{t("Khoản thiếu")}</dt><dd><XuAmount amount={debt} /></dd></div>}
                <div><dt>{t("Dự kiến từ sản phẩm")}</dt><dd>{range || "—"}</dd></div>
              </dl>
              <p className="wallet-details-note">{t("Phần dự kiến chưa thể rút.")} {t("Rút từ 50.000 Xu khả dụng")}</p>
              <div className="wallet-order-stats">{[["Tổng đơn", data?.totalOrders], ["Chờ duyệt", data?.pendingOrders], ["Đã duyệt", data?.approvedOrders]].map(([label, value]) => <div key={String(label)}><b className="num">{number(Number(value || 0))}</b><span>{t(String(label))}</span></div>)}</div>
            </details>
            <Link className="wallet-summary-history" href="/history">{t("Xem lịch sử ví")}<ArrowUpRight size={13} aria-hidden="true" /></Link>
            <WalletWeeklySummary userId={ctx.me!.id} />
          </>}
      </CardContent>
    </Card>
    {customer && membership && <Card className="wallet-summary-membership reward-wallet-membership">
      <CardContent><div className="reward-wallet-tier"><span>{t("Hạng thành viên")}</span><TierBadge code={membership.tierCode} nameVi={membership.nameVi} nameEn={membership.nameEn} /></div><TierBenefits membership={{ ...membership, approvedOrders: data?.approvedOrders ?? membership.approvedOrders }} next={estimate.next} compact /><Link className="wallet-membership-link" href="/membership">{t("Xem quyền lợi")}<ArrowUpRight size={13} aria-hidden="true" /></Link></CardContent>
    </Card>}
    {withdraw && <Modal title={t("Rút tiền về ngân hàng")} onClose={close}><WithdrawalForm ctx={ctx} available={available} debt={debt} onSuccess={close} /></Modal>}
  </aside>;
}
