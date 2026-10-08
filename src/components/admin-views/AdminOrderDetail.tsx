"use client";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, money } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { configuredTierName } from "@/lib/cashback";
import { useI18n } from "@/lib/i18n";
import { Modal, Status } from "../ui";
import { ReportMoney, ShopeeReportStatus } from "./ShopeeReportValue";

export type AdminOrder = components["schemas"]["AdminOrder"];

export function hasRealCommission(publisher: string) {
  return publisher !== "admin-legacy" && publisher !== "legacy-server";
}

export function ProfitAmount({ amount, status }: { amount: number | null | undefined; status?: string }) {
  const { t } = useI18n();
  if (amount == null) return <span className="small mute">{t("Chưa đủ dữ liệu")}</span>;
  return <div className="order-profit-value">
    <b className={amount < 0 ? "num err" : "num"}>{money(amount)}</b>
    {status === "estimated" && <span className="small mute">{t("Dự kiến")}</span>}
    {status === "excluded" && <span className="small mute">{t("Không tính lợi nhuận")}</span>}
  </div>;
}

export function AdminOrderDetail({ endpoint, scope, onClose }: { endpoint: string; scope?: string; onClose: () => void }) {
  const { t, language } = useI18n();
  const query = useQuery<AdminOrder>({ queryKey: [endpoint, scope], queryFn: ({ signal }) => api(endpoint, "GET", undefined, undefined, signal) });
  const order = query.data;
  const fields: [string, ReactNode][] = order ? [
    [t("Khách hàng"), order.name], [t("Sản phẩm"), order.productName],
    [t("Mã đơn"), order.externalId],
    [t("Đặt lúc"), new Date(order.orderedAt).toLocaleString(language === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" })],
    [t("Giá trị đơn"), money(order.value)],
    [t("Trạng thái"), <Status key="status" value={order.status} />],
    [t("Nguồn sàn"), order.isManual ? t("Nhập tay") : <ShopeeReportStatus key="source" value={order.shopeeOrderStatus} fallback={order.sourceStatus} />],
    ...(order.affiliateItemStatus ? [[t("Trạng thái hoa hồng"), <ShopeeReportStatus key="affiliate" value={order.affiliateItemStatus} />] as [string, ReactNode]] : []),
    [t("Kênh"), order.channel],
    [t("Kênh tiếp thị"), order.reportChannel || "—"],
    ...(order.reportedValue ? [[t("Giá trị gốc từ báo cáo"), <ReportMoney key="report-value" value={order.reportedValue} />] as [string, ReactNode]] : []),
    ...(order.reportedCommission ? [[t("Hoa hồng gốc"), <ReportMoney key="report-commission" value={order.reportedCommission} />] as [string, ReactNode]] : []),
    [t("Hạng"), t(configuredTierName(order,language))], [t("Tỷ lệ đã chọn"), order.sharePercent == null ? "—" : `${order.sharePercent}%`],
    ...(order.isManual ? [[t("Ghi chú"), order.note || "—"] as [string, ReactNode]] : []),
  ] : [];
  return <Modal title={t("Chi tiết đơn hàng")} className="order-detail-modal" onClose={onClose}>
    {query.isPending ? <div className="order-detail-loading" role="status">{t("Đang tải…")}</div> : query.error ? <div role="alert">
      <p className="err">{t(query.error.message)}</p>
      <button className="btn sm ghost" onClick={() => void query.refetch()}>{t("Thử lại")}</button>
    </div> : order && <div className="order-detail-content">
      <dl className="customer-order-detail order-detail-facts">
        {fields.slice(0, 2).map(([label, value]) => <div key={label}><dt className="small mute">{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <section className="order-financials" aria-label={t("Thông tin lợi nhuận")}>
        <dl>
          <div><dt>{t("Hoa hồng")}</dt><dd className="num">{hasRealCommission(order.publisher) ? money(order.commission) : t("Chưa đủ dữ liệu")}</dd></div>
          <div><dt>{t("Số Xu hoàn")}</dt><dd className="num">{order.cashback.toLocaleString(language === "en" ? "en-US" : "vi-VN")} Xu</dd></div>
          <div><dt>{t("Thuế 5%")}</dt><dd className="num">{order.taxAmount == null ? t("Chưa đủ dữ liệu") : money(order.taxAmount)}</dd></div>
          <div className="order-financial-total"><dt>{t("Lợi nhuận dự kiến")}</dt><dd><ProfitAmount amount={order.projectedProfit} /></dd></div>
        </dl>
        <p className="small mute">{t("Hoa hồng − Xu hoàn của đơn − thuế 5%.")}</p>
        {order.profitStatus === "estimated" && <p className="small mute">{t("Đơn chờ duyệt; lợi nhuận chỉ là dự kiến.")}</p>}
        {order.profitStatus === "excluded" && <p className="small mute">{t("Đơn bị từ chối không được tính vào lợi nhuận.")}</p>}
        {order.profitStatus === "unavailable" && <p className="small mute">{t("Đơn lịch sử chưa có hoa hồng thực tế để tính thuế và lợi nhuận.")}</p>}
      </section>
      <dl className="customer-order-detail order-detail-metadata">
        {fields.slice(2).map(([label, value]) => <div key={label}><dt className="small mute">{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <details><summary>{t("Thông tin kỹ thuật")}</summary><dl className="customer-order-detail"><div><dt>{t("Mã dòng đơn")}</dt><dd>{order.lineId}</dd></div><div><dt>{t("Mã đơn vị tiếp thị")}</dt><dd>{order.publisher}</dd></div></dl></details>
    </div>}
  </Modal>;
}
