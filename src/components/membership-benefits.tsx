"use client";

import Link from "next/link";
import { ArrowUpRight, Gift, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { configuredTierName } from "@/lib/cashback";
import { percentRange, type RewardTier } from "@/lib/wallet-preview";
import type { Dashboard } from "@/lib/domain";
import type { AppContext } from "./app-context";
import { LoginGate, QueryState, useData } from "./screen-shared";
import { Card } from "./ui";
import { TierBadge, TierBenefits } from "./tier-benefits";
import { XuAmount } from "./xu-amount";

function Benefits({ tier }: { tier: RewardTier }) {
  const { t, language } = useI18n();
  const range = tier.previewAvailable === false ? null : percentRange({ ...tier, minSharePercent: tier.effectiveMinSharePercent ?? tier.minSharePercent, maxSharePercent: tier.effectiveMaxSharePercent ?? tier.maxSharePercent }, language);
  return <dl className="membership-benefit-facts">
    <div><dt>{t("Tỷ lệ hoàn mua hàng")}</dt><dd className="num">{range || "—"}</dd></div>
    <div><dt>{t("Thưởng đổi Xu")}</dt><dd className="num">+{Number(tier.exchangeBonusPercent || 0).toLocaleString(language === "en" ? "en-US" : "vi-VN")}%</dd></div>
    <div><dt>{t("Hoàn vàng tối thiểu trong kỳ")}</dt><dd><XuAmount amount={tier.minGoldTotal || 0}/></dd></div>
  </dl>;
}

function MembershipRules() {
  const { t } = useI18n();
  return <Card title={t("Hiểu quyền lợi thành viên")}>
    <div className="membership-rules">
      <div><TrendingUp size={20} aria-hidden="true"/><div><h3>{t("Tỷ lệ hoàn mua hàng")}</h3><p>{t("Tỷ lệ hoàn tính trên hoa hồng sản phẩm, không phải giá mua. Số Xu dự kiến được hiển thị khi bạn kiểm tra sản phẩm.")}</p></div></div>
      <div><Gift size={20} aria-hidden="true"/><div><h3>{t("Thưởng đổi Xu")}</h3><p>{t("Khi đổi Xu vàng sang Xu xanh, bạn nhận thêm Xu xanh theo mức thưởng của hạng hiện tại. Xu xanh dùng đổi quà và không thể rút.")}</p><Link className="text-link" href="/wallet?exchange=1">{t("Đổi Xu vàng sang Xu xanh")} →</Link></div></div>
    </div>
    <p className="membership-policy-note">{t("Hạng được xét theo tiền hoàn trong kỳ. Link đã tạo giữ quyền lợi tại thời điểm tạo; số dư ví và tổng Xu vàng trọn đời không đặt lại khi sang kỳ.")}</p>
  </Card>;
}

export function MembershipBenefits({ ctx, overview = false }: { ctx: AppContext; overview?: boolean }) {
  const { t, language } = useI18n();
  const customer = ctx.me?.role === "customer";
  const dashboard = useData<Dashboard>("/me/dashboard", customer, ctx.me?.id);
  const membership = dashboard.data?.membership;
  if (!customer) return <LoginGate/>;
  return <div className={`stack membership-benefits${overview ? " overview-membership" : ""}`}>
    {overview && <div className="membership-section-heading"><h2>{t("Quyền lợi thành viên")}</h2><Link className="text-link" href="/membership">{t("Hạng thành viên")} <ArrowUpRight size={15} aria-hidden="true"/></Link></div>}
    <QueryState q={dashboard}>
      {membership ? <>
        {overview ? <>
          <div className="membership-comparison">
            <section className="card benefits-current" aria-label={t("Quyền lợi của bạn")}>
              <div className="membership-card-heading"><h2>{t("Hạng của bạn")}</h2><TierBadge code={membership.tierCode} nameVi={membership.nameVi} nameEn={membership.nameEn}/></div>
              <Benefits tier={membership}/>
              <Link className="text-link" href="/link">{t("Lấy link hoàn tiền")} <ArrowUpRight size={15} aria-hidden="true"/></Link>
            </section>
            {membership.nextTier && <section className="card benefits-next" aria-label={t("Hạng kế tiếp")}>
              <div className="membership-card-heading"><h2>{t("Hạng kế tiếp")}</h2><TierBadge code={membership.nextTier.tierCode} nameVi={membership.nextTier.nameVi} nameEn={membership.nextTier.nameEn}/></div>
              <Benefits tier={membership.nextTier}/>
              <p className="small mute">{t("Còn")} <XuAmount amount={membership.goldToNext}/> {t("Xu vàng để lên hạng")} {t(configuredTierName(membership.nextTier, language))}.</p>
            </section>}
          </div>
          <Card title={t("Lên hạng và giữ hạng")}><TierBenefits membership={membership}/></Card>
        </> : membership.tiers?.length === 4 ? <div className="membership-comparison membership-tiers">
          {membership.tiers.map(tier => <section key={tier.tierCode} className="card membership-tier" aria-label={t(configuredTierName(tier, language))}>
            <h2><TierBadge code={tier.tierCode} nameVi={tier.nameVi} nameEn={tier.nameEn}/></h2>
            <Benefits tier={tier}/>
          </section>)}
        </div> : <Card><p role="alert">{t("Chưa tải được chính sách hạng.")}</p><button className="btn ghost" onClick={() => void dashboard.refetch()}>{t("Thử lại")}</button></Card>}
        <MembershipRules/>
      </> : <Card><p role="alert">{t("Chưa tải được quyền lợi của bạn.")}</p><button className="btn ghost" onClick={() => void dashboard.refetch()}>{t("Thử lại")}</button></Card>}
    </QueryState>
  </div>;
}
