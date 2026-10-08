"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, Form, Status, Table, type Field } from "../ui";
import { AdminPanel, AdminLoading, AdminTabs } from "./admin-ui";
import { channels } from "./constants";
import type { AdminViewProps } from "./types";
import { AdminOrderDetail } from "./AdminOrderDetail";
import { ShopeeReportStatus } from "./ShopeeReportValue";

export function AdminOrders({ctx,rowData,setPage,tab,setTab,dialog,event,pager,common,actionBusy,search,setSearch,data}:AdminViewProps) {
 const {t,language}=useI18n();const [selected,setSelected]=useState("");const [adding,setAdding]=useState(false);
 const [busy,setBusy]=useState(false);const [dirty,setDirty]=useState(false);const [error,setError]=useState("");
 const fields:Field[]=[
  ...["subId1","subId2","subId3","subId4","subId5"].map((name,index)=>({name,label:"Sub_id"+(index+1),section:t("Thông tin tracking từ báo cáo")})),
  {name:"channel",label:t("Kênh"),options:channels.slice(0,1),section:t("Thông tin tracking từ báo cáo")},
  {name:"publisher",label:t("Mã đối tác Shopee (Publisher)"),section:t("Thông tin tracking từ báo cáo")},
  ...[{name:"externalId",label:t("Mã đơn nguồn")},{name:"conversionId",label:t("Mã chuyển đổi (Conversion ID)")},{name:"shopId",label:t("Mã cửa hàng (Shop ID)")},{name:"itemId",label:t("Mã sản phẩm (Item ID)")},{name:"modelId",label:t("Mã phân loại (Model ID)")},{name:"promotionId",label:t("Mã khuyến mại (Promotion ID)")}].map(f=>({...f,section:t("Mã đơn và sản phẩm nguồn")})),
  {name:"orderedAt",label:t("Ngày giờ đặt đơn (GMT+7)"),placeholder:"2026-10-07T12:34:56+07:00",section:t("Nội dung đơn và bằng chứng")},
  {name:"productName",label:t("Sản phẩm"),section:t("Nội dung đơn và bằng chứng")},
  {name:"value",label:t("Giá trị đơn"),type:"number",section:t("Nội dung đơn và bằng chứng")},
  {name:"commission",label:t("Hoa hồng thực nhận"),type:"number",section:t("Nội dung đơn và bằng chứng")},
  {name:"evidence",label:t("Nguồn/bằng chứng"),type:"textarea",section:t("Nội dung đơn và bằng chứng")},
 ];
 return <div className="stack order-admin-page">
  <AdminTabs label="Trạng thái đơn hàng" value={tab} onChange={value=>{setTab(value);setPage(1);}} options={[{value:"pending",label:"Chờ xử lý"},{value:"approved",label:"Đã duyệt"},{value:"rejected",label:"Từ chối"},{value:"",label:"Tất cả"}]}/>
  <Card><div className="admin-toolbar"><label className="field">{t("Tìm đơn hàng")}<input className="inp" type="search" value={search} maxLength={100} placeholder={t("Mã đơn, sản phẩm hoặc tên khách")} onChange={e=>setSearch(e.target.value)}/></label><button className="btn" onClick={()=>{setAdding(true);setDirty(false);setError("");}}>{t("Thêm đơn từ báo cáo sàn")}</button></div>
   {data.isPending?<AdminLoading/>:data.error?<div role="alert"><p className="err">{t(data.error.message)}</p><button className="btn sm ghost" onClick={()=>void data.refetch()}>{t("Thử lại")}</button></div>:<Table responsive scrollLabel={t("Đối soát đơn hàng")} rows={rowData} columns={[
    ...common,
    {label:t("Đơn hàng / sản phẩm"),render:r=><><b>{r.productName}</b><p className="small mute">{r.channel} · {r.externalId}/{r.lineId}</p></>},
    {label:t("Xu hoàn cho khách"),render:r=><span className="num">{Number(r.cashback||0).toLocaleString(language==="en"?"en-US":"vi-VN")} Xu</span>},
    {label:t("Kênh tiếp thị"),render:r=>r.reportChannel||"—"},
    {label:t("Trạng thái"),render:r=><Status value={r.status}/>},
    {label:t("Trạng thái sàn"),render:r=><div className="order-source-states"><ShopeeReportStatus value={r.shopeeOrderStatus} fallback={r.sourceStatus}/>{r.affiliateItemStatus&&<><small className="mute">{t("Hoa hồng")}</small><ShopeeReportStatus value={r.affiliateItemStatus}/></>}</div>},
    {label:t("Thao tác"),render:r=><div className="row wrap">
     <button className="btn sm ghost" onClick={()=>setSelected(r.id)}>{t("Chi tiết")}</button>
     {r.status==="pending"?<>
      <button className="btn sm" disabled={r.sourceStatus!=="approved" || data.isFetching || actionBusy} title={r.sourceStatus!=="approved"?t("Chờ sàn duyệt trong báo cáo"):undefined} onClick={()=>void event("/admin/orders/"+r.id+"/events","approved")}>{t("Duyệt")}</button>
      <button className="btn sm ghost" onClick={()=>dialog(t("Từ chối đơn"),[{name:"reason",label:t("Lý do")}],"/admin/orders/"+r.id+"/events",{},"POST",{action:"rejected"})}>{t("Từ chối đơn")}</button>
     </>:r.status==="rejected"&&r.internallyRejected&&r.sourceStatus!=="rejected"?<button className="btn sm ghost" onClick={()=>dialog(t("Mở lại đơn"),[{name:"reason",label:t("Lý do")}],"/admin/orders/"+r.id+"/events",{},"POST",{action:"reopened"})}>{t("Mở lại đơn")}</button>:null}
    </div>},
   ]}/>}
   {pager}
  </Card>
  {selected && <AdminOrderDetail endpoint={"/admin/orders/"+encodeURIComponent(selected)} scope={ctx.me?.id} onClose={()=>setSelected("")}/>}
  {adding && <AdminPanel title={t("Thêm đơn từ báo cáo sàn")} dirty={dirty&&!busy} onClose={()=>{if(!busy)setAdding(false);}}>
   <p className="small mute">{t("Dùng đủ Sub_id1–5 và thời điểm đặt đơn từ báo cáo Shopee gốc. Đơn nhập tay vẫn chờ duyệt.")}</p>
   {error && <p role="alert" className="err">{error}</p>}
   <Form busy={busy} fields={fields} onDirtyChange={()=>setDirty(true)} submit={t("Thêm đơn")} onSubmit={async values=>{
    setError("");setBusy(true);try{const {subId1,subId2,subId3,subId4,subId5,...order}=values;await ctx.act("/admin/orders","POST",{...order,trackingCode:subId3,subIds:[subId1,subId2,subId3,subId4,subId5]});setDirty(false);setAdding(false);}catch(e){setError(t((e as Error).message));}finally{setBusy(false);}
   }}/>
  </AdminPanel>}
 </div>;
}
