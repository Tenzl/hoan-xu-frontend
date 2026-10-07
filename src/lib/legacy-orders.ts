import type { components } from "./api-schema";
export type LegacyOrderInput = components["schemas"]["LegacyCustomerOrderInput"];
export const legacyOrderExample = JSON.stringify([
  { productName: "Tai nghe Bluetooth", orderedAt: "2026-10-05T10:30:00+07:00", cashback: 12000, note: "Bổ sung đơn mua trước đây" },
  { productName: "Bình giữ nhiệt", orderedAt: "2026-10-06T15:00:00+07:00", cashback: 8000 },
], null, 2);
export type BatchIssue = { index?: number; field?: string; message: string };
const length = (value: string) => Array.from(value.trim()).length;
export function parseLegacyOrders(text: string, now = Date.now()): { orders: LegacyOrderInput[]; issues: BatchIssue[]; total: number } {
  let value: unknown;
  try { value = JSON.parse(text); } catch { return { orders: [], issues: [{ message: "JSON không hợp lệ. Kiểm tra dấu ngoặc và dấu phẩy." }], total: 0 }; }
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return { orders: [], issues: [{ message: "Nhập mảng JSON từ 1–100 đơn." }], total: 0 };
  const issues: BatchIssue[] = [], orders: LegacyOrderInput[] = [];
  value.forEach((v, i) => {
    const issue = (field: string, message: string) => issues.push({ index: i + 1, field, message });
    if (!v || typeof v !== "object" || Array.isArray(v)) { issue("JSON", "Mỗi đơn phải là một đối tượng JSON."); return; }
    for (const field of Object.keys(v)) if (!["productName", "orderedAt", "cashback", "note"].includes(field)) issue(field, "Trường không được hỗ trợ.");
    if (typeof v.productName !== "string" || length(v.productName) < 1 || length(v.productName) > 200) issue("productName", "Tên sản phẩm từ 1–200 ký tự.");
    const match = typeof v.orderedAt === "string" && v.orderedAt.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/);
    const timestamp = Date.parse(v.orderedAt);
    const calendarValid = match && +match[2] >= 1 && +match[2] <= 12 && +match[3] >= 1 && +match[3] <= new Date(Date.UTC(+match[1], +match[2], 0)).getUTCDate() && +match[4] < 24 && +match[5] < 60 && +match[6] < 60;
    if (!calendarValid || !Number.isFinite(timestamp) || timestamp > now) issue("orderedAt", "Ngày giờ phải có múi giờ và không trong tương lai.");
    if (!Number.isSafeInteger(v.cashback) || v.cashback < 1 || v.cashback > 1e12) issue("cashback", "Xu phải là số nguyên từ 1–1.000.000.000.000.");
    if (v.note !== undefined && (typeof v.note !== "string" || length(v.note) > 500)) issue("note", "Ghi chú tối đa 500 ký tự.");
    if (!issues.some(issue => issue.index === i + 1)) orders.push({ productName: v.productName.trim(), orderedAt: v.orderedAt, cashback: v.cashback, ...(v.note === undefined ? {} : { note: v.note.trim() }) });
  });
  return { orders, issues, total: orders.reduce((sum, order) => sum + order.cashback, 0) };
}
