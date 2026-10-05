// Preview only: the backend remains authoritative for recorded orders and balances.
export function expectedXu(commission: number | undefined, minPercent: number, maxPercent: number): { min: number; max: number } | null {
  if (!Number.isSafeInteger(commission) || commission! < 0) return null;
  const min = Math.round(minPercent * 100), max = Math.round(maxPercent * 100);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 10000 || min > max) return null;
  return { min: Number(BigInt(commission!) * BigInt(min) / 10000n), max: Number(BigInt(commission!) * BigInt(max) / 10000n) };
}
