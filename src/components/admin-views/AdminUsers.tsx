"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import type { components } from "@/lib/api-schema";
import type { AppContext } from "../app-context";
import { Card, Table } from "../ui";
import { CustomerPages, canManageCustomerOrders } from "./AdminCustomerOrders";
import { CustomerLeaders, CustomerRank } from "../weekly-prizes";
import { AdminEmpty, AdminLoading } from "./admin-ui";

export function AdminUsers({legacy,ctx}:{legacy:boolean;ctx:AppContext}){
 const {t,language}=useI18n();const url=useSearchParams();const path=legacy?"/admin/legacy-users":"/admin/users";
 const [page,setPage]=useState(()=>Math.max(1,Math.min(10000,Number(url.get("page"))||1)));
 const [search,setSearch]=useState(url.get("q")||"");const [debounced,setDebounced]=useState(search);
 const [expanded,setExpanded]=useState("");
 const savedFilters=useRef(JSON.stringify([search,page]));
 useEffect(()=>{const timer=setTimeout(()=>{setDebounced(search);const signature=JSON.stringify([search,page]);if(savedFilters.current===signature||window.location.pathname!==path)return;savedFilters.current=signature;const p=new URLSearchParams();if(search)p.set("q",search);if(page>1)p.set("page",String(page));window.history.replaceState(null,"",path+(p.size?"?"+p:""));},350);return()=>clearTimeout(timer);},[search,page,path]);
 useEffect(()=>{const restore=()=>{const next=new URLSearchParams(window.location.search);setSearch(next.get("q")||"");setDebounced(next.get("q")||"");setPage(Math.max(1,Math.min(10000,Number(next.get("page"))||1)));};window.addEventListener("popstate",restore);return()=>window.removeEventListener("popstate",restore);},[]);
 const params=new URLSearchParams({kind:legacy?"legacy":"new",q:debounced,page:String(page),perPage:"20"});
 const query=usePagedQuery<components["schemas"]["AdminCustomer"][]>("/admin/users?"+params,true,false,ctx.me?.id);
 const amount=(value:number)=>Number(value||0).toLocaleString(language==="en"?"en-US":"vi-VN")+" Xu";
 const back=path+"?"+new URLSearchParams({q:debounced,page:String(page)});
 const canView=canManageCustomerOrders(ctx.me);
 return <div className="stack customer-admin-list">
  <nav className="admin-tabs" aria-label={t("Nhóm khách hàng")}><Link className="btn sm ghost" href="/admin/users" aria-current={!legacy?"page":undefined}>{t("Khách đăng ký")}</Link><Link className="btn sm ghost" href="/admin/legacy-users" aria-current={legacy?"page":undefined}>{t("Khách từ hệ thống cũ")}</Link></nav>
  <p className="small mute">{t(legacy?"Khách từ hệ thống cũ không có email đăng ký. Có thể chỉnh tên, nhập đơn lịch sử và khóa tài khoản.":"Khách đăng ký có email. Thông tin và đơn hàng được tra cứu theo dữ liệu hệ thống.")}</p>
  <Card><div className="field customer-search"><label htmlFor="customer-search">{t("Tìm khách hàng")}</label><input id="customer-search" type="search" className="inp" value={search} maxLength={100} placeholder={t("Tên hoặc email")} onChange={e=>{setSearch(e.target.value);setPage(1);setExpanded("");}}/></div>
   {query.isPending?<AdminLoading/>:query.error?<div role="alert"><p className="err">{t(query.error.message)}</p><button className="btn sm ghost" onClick={()=>void query.refetch()}>{t("Thử lại")}</button></div>:!query.data?.length?<AdminEmpty title={t("Không tìm thấy khách hàng.")}>{t("Thử tên hoặc email khác, hoặc chuyển nhóm khách hàng.")}</AdminEmpty>:<Table responsive scrollLabel={t("Danh sách khách hàng")} rows={query.data} columns={[
    {label:t("Khách"),render:r=><><b>{r.name}</b>{r.email?.trim()&&<p className="small mute">{r.email}</p>}
     {expanded===r.id&&<dl className="admin-detail-grid">
      <div><dt>{t("Tham gia")}</dt><dd>{date(r.createdAt)}</dd></div><div><dt>{t("Hạng tuần")}</dt><dd><CustomerRank rank={r.weekRank}/></dd></div><div><dt>{t("Hạng tháng")}</dt><dd><CustomerRank rank={r.monthRank}/></dd></div>
      {[[t("Tổng Xu vàng"),r.goldTotal],[t("Đã sử dụng"),r.goldUsed],[t("Tạm giữ"),r.held],[t("Giữ Xu đổi quà"),r.giftHeld],[t("Giữ Xu xanh đổi quà"),r.greenGiftHeld]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{amount(Number(value||0))}</dd></div>)}
     </dl>}
    </>},
    {label:t("Xu vàng khả dụng"),render:r=><span className="num">{amount(r.available)}</span>},
    {label:t("Xu xanh"),render:r=><span className="num">{amount(r.greenAvailable)}</span>},
    {label:t("Trạng thái"),render:r=><span className={"pill "+(r.blocked?"no":"ok")}>{t(r.blocked?"Đã khóa":"Hoạt động")}</span>},
    {label:t("Thao tác"),render:r=><div className="row wrap">
     <button className="btn sm ghost" aria-expanded={expanded===r.id} onClick={()=>setExpanded(expanded===r.id?"":r.id)}>{t("Chi tiết")}</button>
     {canView&&<Link className="btn sm ghost" href={path+"/"+r.id+"/orders?"+new URLSearchParams({returnTo:back})}>{t("Xem đơn hàng")}</Link>}
     {legacy&&<button className="btn sm ghost" onClick={()=>ctx.dialog({title:t(r.blocked?"Mở khóa khách":"Khóa khách"),fields:[{name:"reason",label:t("Lý do")}],submit:t("Xác nhận"),action:async values=>{await ctx.act("/admin/users/"+r.id,"PATCH",{blocked:!r.blocked,reason:values.reason});ctx.dialog(null);}})}>{t(r.blocked?"Mở khóa":"Khóa")}</button>}
    </div>},
   ]}/>}
   <CustomerPages page={page} hasNext={!!query.meta?.hasNext} busy={query.isFetching} onPage={setPage}/>
  </Card>
  <details><summary>{t("Xếp hạng khách hàng")}</summary><CustomerLeaders/></details>
 </div>;
}
