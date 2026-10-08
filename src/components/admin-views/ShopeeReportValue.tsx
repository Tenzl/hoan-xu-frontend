"use client";
import { useI18n } from "@/lib/i18n";
import { Status } from "../ui";

export function ShopeeReportStatus({ value, fallback }: { value?: string; fallback?: string }) {
  const { t } = useI18n();
  if (!value) return fallback ? <Status value={fallback} /> : <>—</>;
  const key = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    pending: "Chờ hoàn thành", unpaid: "Chưa thanh toán", processing: "Đang xử lý", ongoing: "Đang xử lý",
    completed: "Hoàn thành", complete: "Hoàn thành", approved: "Đã xác nhận hoa hồng", validated: "Đã xác nhận hoa hồng",
    cancelled: "Đã hủy", canceled: "Đã hủy", rejected: "Không hợp lệ", invalid: "Không hợp lệ",
  };
  const tone = ["completed", "complete", "approved", "validated"].includes(key) ? "ok" : ["cancelled", "canceled", "rejected", "invalid"].includes(key) || !labels[key] ? "no" : "wait";
  return <span className="shopee-report-status"><span className={"pill " + tone}>{labels[key] ? t(labels[key]) : value}</span>{labels[key] && <small className="mute">{value}</small>}</span>;
}

// Preserve the source fraction as text rather than rounding a floating-point value.
export function ReportMoney({ value, fallback }: { value?: string; fallback?: number }) {
  const { language } = useI18n();
  const raw = value || (fallback == null ? "" : String(fallback));
  if (raw.length > 64) return <>{raw.slice(0, 64)}…</>;
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return <>{raw || "—"}</>;
  const [whole, fraction] = raw.split(".");
  return <span className="num">{BigInt(whole).toLocaleString(language === "en" ? "en-US" : "vi-VN")}{fraction == null ? "" : (language === "en" ? "." : ",") + fraction}₫</span>;
}
