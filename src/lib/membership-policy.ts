// Calendar preview only. The server remains authoritative for tier and money.
export function previewPeriod(months: number, anchor: string, today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)) {
  if (!Number.isInteger(months) || months < 1 || months > 12 || !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) return null;
  const original = new Date(`${anchor}T00:00:00Z`);
  if (!Number.isFinite(original.getTime()) || original.getUTCFullYear() < 1 || original.toISOString().slice(0, 10) !== anchor) return null;
  const current = new Date(`${today}T00:00:00Z`);
  const difference = (current.getUTCFullYear() - original.getUTCFullYear()) * 12 + current.getUTCMonth() - original.getUTCMonth();
  const boundary = (n: number) => {
    const first = new Date(0);
    first.setUTCFullYear(original.getUTCFullYear(), original.getUTCMonth() + n * months, 1);
    const lastDay = new Date(first);
    lastDay.setUTCMonth(first.getUTCMonth() + 1, 0);
    const last = lastDay.getUTCDate();
    first.setUTCDate(Math.min(original.getUTCDate(), last));
    return first.toISOString().slice(0, 10);
  };
  let n = Math.floor(difference / months);
  if (today < boundary(n)) n--;
  return { start: boundary(n), end: boundary(n + 1), previous: boundary(n - 1) };
}
