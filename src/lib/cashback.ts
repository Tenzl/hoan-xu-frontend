export function tierName(code: unknown): string {
  return code === "diamond"
    ? "Kim cương"
    : code === "platinum"
      ? "Bạch kim"
      : code === "bronze"
        ? "Đồng"
        : "Chính sách cũ";
}
export function shareRange(min: unknown, max: unknown): string {
  if (min == null || max == null) return "—";
  return Number(min) === Number(max)
    ? `${Number(min)}%`
    : `${Number(min)}–${Number(max)}%`;
}
