export function tierName(code: unknown): string {
  return code === "member" ? "Thân thiết" : code === "silver" ? "Bạc" : code === "gold" ? "Vàng" : code === "diamond"
    ? "Kim cương"
    : code === "platinum"
      ? "Bạch kim"
      : code === "bronze"
        ? "Đồng"
        : "Chính sách cũ";
}
export function configuredTierName(tier: { tierCode?: unknown; nameVi?: string | null; nameEn?: string | null; tierNameVi?: string | null; tierNameEn?: string | null }, language: string): string {
  return (language === "en" ? tier.nameEn || tier.tierNameEn : tier.nameVi || tier.tierNameVi) || tierName(tier.tierCode);
}
export function shareRange(min: unknown, max: unknown): string {
  if (min == null || max == null) return "—";
  return Number(min) === Number(max)
    ? `${Number(min)}%`
    : `${Number(min)}–${Number(max)}%`;
}
