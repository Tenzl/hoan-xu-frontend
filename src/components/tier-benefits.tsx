"use client";

import { ArrowUpRight, Gem, Medal, ShieldCheck } from "lucide-react";
import { tierName } from "@/lib/cashback";
import { useI18n } from "@/lib/i18n";
import { moneyRange, type RewardMembership, type RewardRange } from "@/lib/wallet-preview";

export function TierBadge({ code }: { code: string }) {
  const { t } = useI18n();
  const Icon = code === "diamond" ? Gem : Medal;
  return <span className={`reward-tier-badge ${code}`}><Icon size={14} aria-hidden="true" />{t(tierName(code))}</span>;
}

export function TierBenefits({ membership, next = null, compact = false }: {
  membership: RewardMembership; next?: RewardRange | null; compact?: boolean;
}) {
  const { t, language } = useI18n();
  const nextTier = membership.nextTier;
  const range = moneyRange(next, language);
  if (!nextTier) return <div className="reward-highest"><ShieldCheck size={15} aria-hidden="true" />{t("Bạn đang ở hạng cao nhất")}</div>;
  const approved = Number(membership.approvedOrders || 0);
  const start = Number(membership.minApprovedOrders || 0);
  const remaining = Math.max(0, Number(membership.ordersToNext || 0));
  const target = Number(nextTier.minApprovedOrders ?? approved + remaining);
  const span = Math.max(1, target - start);
  return <div className={`reward-upgrade${compact ? " compact" : ""}`}>
    <div className="reward-upgrade-heading">
      <p>{t("Còn")} <b className="num">{remaining.toLocaleString(language === "en" ? "en-US" : "vi-VN")}</b> {t("đơn đã duyệt để lên")} <b>{t(tierName(nextTier.tierCode))}</b></p>
      <ArrowUpRight size={16} aria-hidden="true" />
    </div>
    <progress className="reward-progress" aria-label={t("Tiến độ lên hạng")} aria-valuetext={`${approved} / ${target} ${t("đơn đã duyệt")}`} max={span} value={Math.min(span, Math.max(0, approved - start))} />
    {range ? <div className="reward-next-estimate">
      <span>{t("Nếu ở hạng")} {t(tierName(nextTier.tierCode))}<small>{t("Với sản phẩm này")}</small></span>
      <strong className="num">{range}</strong>
    </div> : <p className="reward-next-hint">{t("Lên hạng thật hay, thêm vui mỗi ngày.")}</p>}
  </div>;
}
