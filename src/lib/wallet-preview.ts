// Preview only: the backend remains authoritative for recorded orders and balances.
export function expectedXu(commission: number | undefined, minPercent: number, maxPercent: number): { min: number; max: number } | null {
  if (!Number.isSafeInteger(commission) || commission! < 0) return null;
  const min = Math.round(minPercent * 100), max = Math.round(maxPercent * 100);
  if (minPercent == null || maxPercent == null || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 10000 || min > max) return null;
  return { min: Number((BigInt(commission!) * BigInt(min) + 9999n) / 10000n), max: Number((BigInt(commission!) * BigInt(max) + 9999n) / 10000n) };
}

export type RewardRange = { min: number; max: number };
export type RewardTier = {
  tierCode: string;
  minSharePercent: number;
  maxSharePercent: number;
  effectiveMinSharePercent?: number;
  effectiveMaxSharePercent?: number;
  previewAvailable?: boolean;
  minGoldTotal?: number;
  nameVi?: string;
  nameEn?: string;
  tierNameVi?: string | null;
  tierNameEn?: string | null;
  exchangeBonusPercent?: number;
};
export type RewardMembership = RewardTier & {
  policyId?: string;
  approvedOrders?: number;
  periodGoldTotal?: number;
  previousPeriodGoldTotal?: number;
  goldToNext?: number;
  goldToMaintain?: number;
  startingTierCode?: string;
  nextPeriodTierCode?: string;
  nextPeriodNameVi?: string;
  nextPeriodNameEn?: string;
  periodStartsAt?: string;
  periodEndsAt?: string;
  asOf?: string;
  nextTier?: RewardTier | null;
};
export type RewardSnapshot = RewardTier & { policyId?: string; effectiveSharePercent?: number; sharePercent?: number; payoutFactor?: string };
export function moneyRange(range: RewardRange | null, language: string): string | null {
  if (!range) return null;
  const format = (value: number) => value.toLocaleString(language === "en" ? "en-US" : "vi-VN");
  return `${format(range.min)}${range.min === range.max ? "" : "–" + format(range.max)}${language === "en" ? "₫" : "đ"}`;
}
export function rewardEstimate(product: { schemaVerified: boolean; commission?: number } | undefined, membership: RewardMembership | undefined, snapshot?: RewardSnapshot | null) {
  const policy = rewardPolicy(membership, snapshot);
  const calculate = (tier: RewardTier | null | undefined) => product?.schemaVerified && tier && tier.previewAvailable !== false
    ? expectedXu(product.commission, tier.effectiveMinSharePercent ?? tier.minSharePercent, tier.effectiveMaxSharePercent ?? tier.maxSharePercent) : null;
  // Keep the preview as the link's saved range, including after link creation.
  return { current: calculate(policy.current), next: calculate(membership?.nextTier), snapshotChanged: policy.snapshotChanged };
}
// Display the configured share range, independently of a product's commission.
export function percentRange(tier: RewardTier | null | undefined, language: string): string | null {
  if (!tier || tier.minSharePercent == null || tier.maxSharePercent == null) return null;
  const min = Number(tier.minSharePercent), max = Number(tier.maxSharePercent);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 100 || min > max) return null;
  const format = (value: number) => value.toLocaleString(language === "en" ? "en-US" : "vi-VN", { maximumFractionDigits: 2 });
  return `${format(min)}${min === max ? "" : "–" + format(max)}%`;
}
export function rewardPolicy(membership: RewardMembership | undefined, snapshot?: RewardSnapshot | null) {
  return {
    current: snapshot || membership,
    snapshotChanged: Boolean(snapshot && membership && (
      snapshot.tierCode !== membership.tierCode || snapshot.minSharePercent !== membership.minSharePercent
      || snapshot.maxSharePercent !== membership.maxSharePercent
      || (snapshot.policyId && membership.policyId && snapshot.policyId !== membership.policyId)
    )),
  };
}
