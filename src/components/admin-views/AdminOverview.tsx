"use client";
import type { components } from "@/lib/api-schema";
import { api, money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { AppContext } from "../app-context";
import { Card, type Data } from "../ui";
import { ProfitAmount } from "./AdminOrderDetail";
import { canAdmin } from "./admin-navigation";
import { AdminEmpty, AdminLoading } from "./admin-ui";

export function AdminOverview({ctx}: {ctx:AppContext}) {
 const {t}=useI18n();
 const queues=useQuery<components["schemas"]["AdminWorkQueues"]>({queryKey:["/admin/work-queues",ctx.me?.id],queryFn:({signal})=>api("/admin/work-queues","GET",undefined,undefined,signal),refetchInterval:30000});
 const finance=useQuery<Data>({queryKey:["/admin/dashboard",ctx.me?.id],queryFn:({signal})=>api("/admin/dashboard","GET",undefined,undefined,signal),enabled:canAdmin(ctx.me,"audit")});
 const tasks=[
  {permission:"orders",label:t("Đơn chờ đối soát"),key:"pendingOrders" as const,href:"/admin/orders"},
  {permission:"withdrawals",label:t("Yêu cầu rút tiền"),key:"pendingWithdrawals" as const,href:"/admin/withdrawals"},
  {permission:"gifts",label:t("Yêu cầu đổi quà"),key:"pendingGifts" as const,href:"/admin/gifts"},
 ].filter(task=>canAdmin(ctx.me,task.permission));
 const d=finance.data;
 return <div className="stack">
  <Card title={t("Việc cần xử lý")}>
   <p className="small mute">{t("Công việc của cả khách đăng ký và khách từ hệ thống cũ.")}</p>
   {queues.isPending?<AdminLoading/>:queues.error?<div role="alert"><p className="err">{t(queues.error.message)}</p><button className="btn sm ghost" onClick={()=>void queues.refetch()}>{t("Thử lại")}</button></div>:<>
    {tasks.length?<ul className="admin-queue-list">{tasks.map(task=><li key={task.key}><span>{task.label}</span><strong>{queues.data?.[task.key] ?? 0}</strong>{task.permission==="withdrawals" && <small className="mute">{queues.data?.processingWithdrawals ?? 0} {t("yêu cầu đang xử lý")}</small>}<Link className="btn sm" href={task.href}>{t("Mở danh sách")}</Link></li>)}</ul>:<AdminEmpty title={t("Không có hàng đợi được giao")}>{t("Sử dụng các mục trong menu theo quyền được cấp.")}</AdminEmpty>}
    {ctx.me?.role==="staff" && !ctx.me.permissions?.length && <p className="note">{t("Tài khoản chưa được cấp quyền. Liên hệ quản trị viên để được giao chức năng.")}</p>}
   </>}
  </Card>
  {canAdmin(ctx.me,"audit") && <Card title={t("Kết quả tài chính")}>
   <p className="small mute">{t("Số liệu tài chính chỉ tính khách đăng ký; không gồm khách từ hệ thống cũ.")}</p>
   {finance.isPending?<AdminLoading/>:finance.error?<div role="alert"><p className="err">{t(finance.error.message)}</p><button className="btn sm ghost" onClick={()=>void finance.refetch()}>{t("Thử lại")}</button></div>:<div className="stack">
    <div className="grid3">{[[t("Hoa hồng đã duyệt"),"commission"],[t("Thuế 5%"),"taxAmount"],[t("Đã chuyển khoản"),"paid"]].map(([label,key])=><div className="stat" key={key}><span className="small mute">{label}</span><b className="num">{d?.[key]==null || (key==="commission" && d?.profitUnavailableOrders>0)?t("Chưa đủ dữ liệu"):money(d[key])}</b></div>)}</div>
    <div className="grid2 profit-overview"><div className="stat"><span className="small mute">{t("Lợi nhuận dự kiến")}</span><ProfitAmount amount={d?.projectedProfit}/><p className="small mute">{t("Hoa hồng đã duyệt − Xu hoàn khách − thuế.")}</p></div><div className="stat"><span className="small mute">{t("Lợi nhuận theo thực chi")}</span><ProfitAmount amount={d?.cashProfit}/><p className="small mute">{t("Hoa hồng đã duyệt − tiền đã chuyển khoản − thuế.")}</p></div></div>
    <p className="small mute">{t("Lợi nhuận theo thực chi chưa trừ Xu khách chưa rút.")}</p>
    {!!d?.profitUnavailableOrders && <p className="note" role="status">{d.profitUnavailableOrders} {t("đơn đã duyệt chưa có hoa hồng thực tế; chưa thể tính tổng lợi nhuận.")}</p>}
    <div className="grid2">{[[t("Hoàn cho khách"),"cashback"],[t("Hoa hồng chờ đối soát"),"pendingCommission"],[t("Khách đăng ký"),"users"],[t("Link đã tạo"),"links"]].map(([label,key])=><div className="stat" key={key}><span className="small mute">{label}</span><b className="num">{key==="users"||key==="links"?d?.[key]??0:money(d?.[key])}</b></div>)}</div>
   </div>}
  </Card>}
 </div>;
}
