"use client";
import { useEffect, useRef, useState } from "react";
import { usePagedQuery } from "@/lib/paged-query";
import { money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLinkClock } from "@/lib/link-expiry";
import type { components } from "@/lib/api-schema";
import type { AppContext } from "./hoanxu";
import { Card, Empty } from "./ui";
import Link from "next/link";
import { XuAmount } from "./xu-amount";
import { SavedLink } from "./saved-links";

type Purchase = components["schemas"]["Purchase"];
const tabs = { all: "Tất cả", selecting: "Link đã tạo", progress: "Chờ duyệt", completed: "Đã duyệt", rejected: "Hủy / không được hoàn" } as const;

function PurchaseEntry({ row, ctx }: { row: Purchase; ctx: AppContext }) {
  const { t, language } = useI18n();
  const productName = row.order?.productName || row.link?.productName || t("Tên sản phẩm chưa có");
  const label = row.status === "legacy" ? t("Link lịch sử — chỉ đọc") : row.kind === "link" && row.status === "rejected" ? t("Link đã hết hạn hoặc đã hủy") : t(tabs[row.status as keyof typeof tabs] || "Đang xử lý");
  const formatTime = (value: string) => {
    const timestamp = new Date(value);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString(language === "en" ? "en-GB" : "vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) : "—";
  };
  return <article className="purchase-entry" data-purchase-id={row.id}>
    <p className="small mute">{t(row.order ? "Đơn đã ghi nhận" : "Link chưa có đơn ghi nhận")}</p><header className="purchase-entry-heading"><h3>{productName}</h3><span className={`purchase-status is-${row.status}`}>{label}</span></header>
    {row.order ? <dl className="purchase-facts">
      <div><dt>{t("Mã đơn")}</dt><dd>{row.order.externalId}</dd></div>
      <div><dt>{t("Đặt lúc")}</dt><dd><time dateTime={row.order.orderedAt}>{formatTime(row.order.orderedAt)}</time></dd></div>
      <div><dt>{t("Giá trị đơn")}</dt><dd>{money(row.order.value)}</dd></div>
      <div className="purchase-cashback"><dt>{t("Hoàn Xu")}</dt><dd><XuAmount amount={row.status === "rejected" ? 0 : row.order.cashback}/></dd></div>
    </dl> : row.link?.createdAt && <p className="purchase-created">{t("Tạo lúc")} <time dateTime={row.link.createdAt}>{formatTime(row.link.createdAt)}</time></p>}
    {row.link ? <SavedLink link={row.link} ctx={ctx} embedded showName={false}/> : <p className="purchase-note">{t("Link không còn trong danh sách; đơn vẫn được đối soát.")}</p>}
  </article>;
}

export function Purchases({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<keyof typeof tabs>("all");
  const [page, setPage] = useState(1);
  const query = usePagedQuery<Purchase[]>(`/me/purchases?status=${status}&perPage=10&page=${page}`, true, 15000, ctx.me?.id);
  const rows = Array.isArray(query.data) ? query.data : [];
  const now = useLinkClock(rows.find(row => row.link?.expiresAt)?.link?.expiresAt || undefined);
  const refreshed = useRef(new Set<string>());
  useEffect(() => {
    const expired = status === "selecting" && rows.find(row => row.link?.expiresAt && Date.parse(row.link.expiresAt) <= now && !refreshed.current.has(row.id));
    if (expired) { refreshed.current.add(expired.id); void query.refetch(); }
  }, [status, rows, now, query]);
  const visible = rows.filter(row => status !== "selecting" || !row.link?.expiresAt || Date.parse(row.link.expiresAt) > now);
  return <section className="purchases-screen" aria-label={t("Lịch sử mua hàng")}>
    <div className="tabs purchases-tabs" aria-label={t("Trạng thái")}>
      {Object.entries(tabs).map(([key, label]) => <button key={key} type="button" aria-pressed={status === key} onClick={() => { setStatus(key as keyof typeof tabs); setPage(1); }}>{t(label)}</button>)}
    </div>
    {query.isPending && <div className="purchase-list" role="status" aria-label={t("Đang tải…")}><div className="purchase-skeleton" aria-hidden="true"/><div className="purchase-skeleton" aria-hidden="true"/></div>}
    {query.isError && <Card><p className="err" role="alert">{t("Chưa tải được dữ liệu. Vui lòng thử lại.")}</p><button className="btn sm" onClick={() => void query.refetch()}>{t("Thử lại")}</button></Card>}
    {!query.isPending && !query.isError && visible.length === 0 && <Card><Empty text={status === "selecting" ? t("Chưa có link đã tạo. Lấy link hoàn tiền để bắt đầu.") : t("Chưa có dữ liệu trong mục này.")} /><Link className="btn" href="/link">{t("Lấy link hoàn tiền")}</Link></Card>}
    {visible.length > 0 && <div className="purchase-list">{visible.map(row => <PurchaseEntry key={row.id} row={row} ctx={ctx}/>)}</div>}
    <nav className="purchase-pager" aria-label={t("Phân trang")}><button className="btn sm ghost" disabled={page === 1 || query.isFetching} onClick={() => setPage(page - 1)}>{t("← Trước")}</button><span>{t("Trang")} {page}</span><button className="btn sm ghost" disabled={!query.meta?.hasNext || query.isFetching} onClick={() => setPage(page + 1)}>{t("Tiếp →")}</button></nav>
  </section>;
}
