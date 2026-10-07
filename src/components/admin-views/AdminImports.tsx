"use client";
import { useRef, useState } from "react";
import { date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import { Card, Status, Table, type Data } from "../ui";
import { CustomerPages } from "./AdminCustomerOrders";
import { AdminFeedback, AdminLoading, AdminUnsavedChanges } from "./admin-ui";
import type { AdminViewProps } from "./types";

export function AdminImports({ctx,rowData,pager,dialog,setPage}:AdminViewProps){
 const {t}=useI18n();const [file,setFile]=useState<File|null>(null);const [mapping,setMapping]=useState("");
 const [selected,setSelected]=useState("");const [rowPage,setRowPage]=useState(1);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 const rows=usePagedQuery<Data[]>(selected?"/admin/order-imports/"+encodeURIComponent(selected)+"/rows?perPage=100&page="+rowPage:"/admin/order-imports",!!selected,3000,ctx.me?.id);
 const input=useRef<HTMLInputElement>(null);
 const batch=rowData.find(row=>row.id===selected);
 function view(id:string){setSelected(id);setRowPage(1);setError("");}
 async function preview(){
  if(!file||busy)return;setBusy(true);setError("");setMessage("");
  try{
   if(file.size>10*1024*1024 || !file.name.toLowerCase().endsWith(".csv"))throw new Error(t("Chọn file CSV, tối đa 10 MB."));
   if(mapping.trim()){const parsed=JSON.parse(mapping);if(!parsed||Array.isArray(parsed)||typeof parsed!=="object"||Object.values(parsed).some(v=>typeof v!=="string"))throw new Error(t("Ánh xạ cột phải là đối tượng JSON gồm các tên cột."));}
   const form=new FormData();form.set("file",file);form.set("mapping",mapping.trim()||"{}");
   const b=await ctx.act("/admin/order-imports","POST",form);setPage(1);view(b.id);setFile(null);if(input.current)input.current.value="";setMessage(t("Đã tải báo cáo. Kiểm tra dữ liệu trước khi xác nhận nhập."));
  }catch(e){setError(e instanceof SyntaxError?t("Ánh xạ cột không phải JSON hợp lệ."):t((e as Error).message));}finally{setBusy(false);}
 }
 async function action(id:string,kind:"commit"|"retry"){
  if(busy)return;setBusy(true);setError("");
  try{await ctx.act("/admin/order-imports/"+id+"/"+kind);setMessage(t(kind==="commit"?"Đã xếp hàng nhập báo cáo. Kết quả sẽ tự cập nhật.":"Đã xếp hàng thử lại báo cáo."));}
  catch(e){setError(t((e as Error).message));}finally{setBusy(false);}
 }
 const counts=(r:Data)=><div className="admin-counts">{Object.entries(r.counts||{}).map(([key,value])=><span key={key}><Status value={key}/> {String(value)}</span>)}</div>;
 return <div className="stack">
  <AdminUnsavedChanges dirty={!!file&&!busy}/>
  <Card title={t("Tải báo cáo")}>
   <p className="small mute">{t("CSV UTF-8, tối đa 10 MB và 50.000 dòng. Giá trị và hoa hồng dùng số nguyên VND.")}</p>
   <div className="admin-toolbar"><label className="field">{t("Chọn báo cáo CSV")}<input ref={input} className="inp" type="file" accept=".csv" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setError("");}}/></label><button className="btn" disabled={!file||busy} onClick={()=>void preview()}>{t(busy?"Đang xử lý…":"Xem trước báo cáo")}</button><a className="btn ghost" href="/templates/report-example.csv" download>{t("Tải file mẫu")}</a></div>
   <details><summary>{t("Ánh xạ cột nâng cao")}</summary><label className="field">{t("Ánh xạ cột (JSON)")}<textarea className="inp" disabled={busy} value={mapping} onChange={e=>setMapping(e.target.value)} placeholder='{"order_id":"Mã đơn"}'/></label><p className="small mute">{t("Để trống để dùng tên cột chuẩn. Chỉ chỉnh khi báo cáo có tên cột khác.")}</p></details>
  </Card>
  <AdminFeedback error={error} message={message}/>
  <Card title={t("Lịch sử nhập báo cáo")}><Table responsive scrollLabel={t("Lịch sử nhập báo cáo")} rows={rowData} columns={[
   {label:t("Ngày"),render:r=>date(r.createdAt)},{label:t("Tên file"),render:r=>r.filename},{label:t("Trạng thái"),render:r=><><Status value={r.status}/>{r.error&&<p className="small err">{t(r.error)}</p>}</>},
   {label:t("Kết quả"),render:counts},{label:t("Thao tác"),render:r=><div className="row wrap"><button className="btn sm ghost" onClick={()=>view(r.id)}>{t("Xem trước")}</button>{r.status==="failed"&&<button className="btn sm ghost" disabled={busy} onClick={()=>void action(r.id,"retry")}>{t("Thử lại")}</button>}</div>},
  ]}/>{pager}</Card>
  {selected&&<section role="region" aria-label={t("Xem trước dữ liệu")}><Card title={t("Xem trước dữ liệu")}>
   <div className="admin-toolbar"><div><p>{batch?.filename||file?.name}</p>{batch&&counts(batch)}</div>{batch?.status==="preview"&&<button className="btn" disabled={busy||rows.isPending||!!rows.error} onClick={()=>void action(selected,"commit")}>{t("Xác nhận nhập")}</button>}<button className="btn sm ghost" onClick={()=>setSelected("")}>{t("Đóng xem trước")}</button></div>
   {rows.isPending?<AdminLoading/>:rows.error?<div role="alert"><p className="err">{t(rows.error.message)}</p><button className="btn sm ghost" onClick={()=>void rows.refetch()}>{t("Thử lại")}</button></div>:<Table responsive scrollLabel={t("Dòng báo cáo")} rows={rows.data||[]} columns={[
    {label:t("Dòng"),render:r=>r.number},{label:t("Trạng thái"),render:r=><Status value={r.status}/>},
    {label:t("Đơn/sản phẩm"),render:r=><>{r.payload?.orderId}/{r.payload?.lineId}<p>{r.payload?.productName}</p></>},
    {label:t("Mã tracking"),render:r=>r.payload?.trackingCode},
    {label:t("Trạng thái sàn"),render:r=><Status value={r.payload?.status||""}/>},
    {label:t("Lỗi"),render:r=>r.error||"—"},
    {label:t("Thao tác"),render:r=>r.status==="unmatched"&&<button className="btn sm ghost" onClick={()=>dialog(t("Khớp tracking từ bằng chứng"),[{name:"trackingCode",label:t("Tracking đúng có trong hệ thống")},{name:"reason",label:t("Bằng chứng/lý do")}],"/admin/order-imports/"+selected+"/rows/"+r.number+"/resolve")}>{t("Khớp")}</button>},
   ]}/>}
   <CustomerPages page={rowPage} hasNext={!!rows.meta?.hasNext} busy={rows.isFetching} onPage={setRowPage}/>
   <p className="small mute">{t("Đơn chưa duyệt vẫn chờ admin xử lý. Báo cáo khác với đơn đã duyệt được bỏ qua, không thay đổi ví.")}</p>
  </Card></section>}
 </div>;
}
