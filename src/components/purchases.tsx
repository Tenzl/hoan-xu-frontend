"use client";
import { useState } from "react";
import Link from "next/link";
import { Clock3 } from "lucide-react";
import { usePagedQuery } from "@/lib/paged-query";
import { money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLinkClock } from "@/lib/link-expiry";
import type { Order, SavedAffiliateLink } from "@/lib/domain";
import type { AppContext } from "./hoanxu";
import { Card, Empty } from "./ui";
import { XuAmount } from "./xu-amount";
import { SavedLink, savedLinkDeleteAt } from "./saved-links";
import { useCashbackFlow } from "./cashback-flow";

const routes = [
 ["/saved-links", "Link đã tạo", null],
 ["/orders/pending", "Chờ duyệt", "pending"],
 ["/orders/approved", "Đã duyệt", "approved"],
 ["/orders/rejected", "Hủy / không được hoàn", "rejected"],
] as const;

function OrderEntry({ order }: { order: Order }) {
 const {t,language}=useI18n();
 const status=order.status;
 const label=status==="pending"?"Chờ duyệt":status==="approved"?"Đã duyệt":"Hủy / không được hoàn";
 const formatTime=(value:string)=>new Date(value).toLocaleString(language==="en"?"en-GB":"vi-VN",{timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
 return <article className="purchase-entry" data-order-id={order.id} data-purchase-id={order.id}>
  <header className="purchase-entry-heading"><div className="purchase-entry-meta"><p>{t("Đơn đã ghi nhận")}</p><span className={`purchase-status is-${status==="pending"?"progress":status==="approved"?"completed":"rejected"}`}>{t(label)}</span></div><h3>{order.productName||t("Tên sản phẩm chưa có")}</h3></header>
  <dl className="purchase-facts">
   <div><dt>{t("Mã đơn")}</dt><dd>{order.externalId}</dd></div>
   <div><dt>{t("Đặt lúc")}</dt><dd><time dateTime={order.orderedAt}>{formatTime(order.orderedAt)}</time></dd></div>
   <div><dt>{t("Giá trị đơn")}</dt><dd>{money(order.value)}</dd></div>
   <div className="purchase-cashback"><dt>{t(status==="pending"?"Chờ duyệt (dự kiến)":"Hoàn Xu")}</dt><dd><XuAmount amount={status==="rejected"?0:order.cashback}/></dd></div>
  </dl>
 </article>;
}

export function Purchases({ ctx, path }: { ctx: AppContext; path:string }) {
 const {t}=useI18n();
 const flow=useCashbackFlow();
 const [page,setPage]=useState(1);
 const saved=path==="/saved-links";
 const status=routes.find(r=>r[0]===path)?.[2]||"pending";
 const suffix=`perPage=10&page=${page}`;
 const links=usePagedQuery<SavedAffiliateLink[]>(`/affiliate-links?${suffix}`,saved,15000,ctx.me?.id);
 const orders=usePagedQuery<Order[]>(`/orders?status=${status}&${suffix}`,!saved,15000,ctx.me?.id);
 const now=useLinkClock(links.data?.find(l=>!l.legacy)?.autoDeleteAt||undefined);
 const visible=(links.data||[]).filter(l=>l.legacy||Date.parse(savedLinkDeleteAt(l)||"")>now);
 const query=saved?links:orders;
 const empty=saved?visible.length===0:!orders.data?.length;
 return <section className="purchases-screen" aria-label={t(saved?"Link đã tạo":"Lịch sử mua hàng")}>
  <nav className="tabs purchases-tabs" aria-label={t("Link và đơn hàng")}>{routes.map(([href,label])=><Link key={href} href={href} aria-current={path===href?"page":undefined}>{t(label)}</Link>)}</nav>
  {saved?<p className="purchase-update-note"><Clock3 size={16} aria-hidden="true"/>{t("Link tự xóa sau 5 ngày. Việc xóa link không ảnh hưởng đến đối soát đơn hàng từ CSV Shopee.")}</p>:<p className="purchase-update-note"><Clock3 size={16} aria-hidden="true"/>{t("Đơn hàng được cập nhật lúc 10:00 hằng ngày (giờ Việt Nam).")}</p>}
  {query.isPending&&<div className="purchase-list" role="status" aria-label={t("Đang tải…")}><div className="purchase-skeleton" aria-hidden="true"/><div className="purchase-skeleton" aria-hidden="true"/></div>}
  {query.isError&&<Card><p className="err" role="alert">{t("Chưa tải được dữ liệu. Vui lòng thử lại.")}</p><button className="btn sm" onClick={()=>void query.refetch()}>{t("Thử lại")}</button></Card>}
  {!query.isPending&&!query.isError&&empty&&<Card><Empty text={t(saved?"Chưa có link đã tạo. Lấy link hoàn tiền để bắt đầu.":"Chưa có dữ liệu trong mục này.")}/><Link className="btn" href="/link">{t("Lấy link hoàn tiền")}</Link></Card>}
  {!query.isPending&&!query.isError&&!empty&&<div className="purchase-list">{saved?visible.map(link=><SavedLink key={link.id} link={link} ctx={ctx} onDeleted={()=>{if(flow.result?.id===link.id)flow.clearResult();}}/>):orders.data?.map(order=><OrderEntry key={order.id} order={order}/>)}</div>}
  <nav className="purchase-pager" aria-label={t("Phân trang")}><button className="btn sm ghost" disabled={page===1||query.isFetching} onClick={()=>setPage(page-1)}>{t("← Trước")}</button><span>{t("Trang")} {page}</span><button className="btn sm ghost" disabled={!query.meta?.hasNext||query.isFetching} onClick={()=>setPage(page+1)}>{t("Tiếp →")}</button></nav>
 </section>;
}
