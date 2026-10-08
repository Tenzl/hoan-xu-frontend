"use client";
import { useRef, useState } from "react";
import { FileSpreadsheet, Upload, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import { Card, Status, Table, type Data } from "../ui";
import { CustomerPages } from "./AdminCustomerOrders";
import { AdminFeedback, AdminLoading, AdminUnsavedChanges } from "./admin-ui";
import { ReportMoney, ShopeeReportStatus } from "./ShopeeReportValue";
import type { AdminViewProps } from "./types";

export function AdminImports({ctx,rowData,pager,dialog,setPage}:AdminViewProps) {
 const {t,language}=useI18n();
 const cache=useQueryClient();
 const [file,setFile]=useState<File|null>(null), [mapping,setMapping]=useState("");
 const [selected,setSelected]=useState(""), [uploadedBatch,setUploadedBatch]=useState<Data|null>(null);
 const [rowPage,setRowPage]=useState(1), [busy,setBusy]=useState(false), [dragging,setDragging]=useState(false);
 const [error,setError]=useState(""), [message,setMessage]=useState(""), [mappingDirty,setMappingDirty]=useState(false);
 const working=useRef(false), previewRegion=useRef<HTMLElement>(null);
 const rows=usePagedQuery<Data[]>(selected?`/admin/order-imports/${encodeURIComponent(selected)}/rows?perPage=100&page=${rowPage}`:"/admin/order-imports",!!selected,3000,ctx.me?.id);
 const batch=rowData.find(row=>row.id===selected)||(uploadedBatch?.id===selected?uploadedBatch:null);
 const count=(key:string)=>Number(batch?.counts?.[key]||0);
 const total=Object.values(batch?.counts||{}).reduce<number>((sum,value)=>sum+Number(value),0);
 const hasInvalid=count("invalid")>0||!!rows.data?.some(row=>row.status==="invalid");
 const completed=batch?.status==="completed";
 const currentStep=batch&&batch.status!=="preview"?2:selected?1:0;
 function view(id:string){const found=rowData.find(row=>row.id===id);if(found)setUploadedBatch(found);setSelected(id);setRowPage(1);setError("");setMappingDirty(false);}
 async function preview(chosen=file){
  if(!chosen||working.current)return;
  working.current=true;setBusy(true);setError("");setMessage("");setSelected("");setUploadedBatch(null);
  try{
   if(chosen.size>10*1024*1024||!chosen.name.toLowerCase().endsWith(".csv"))throw new Error(t("Chọn file CSV, tối đa 10 MB."));
   if(mapping.trim()){const parsed=JSON.parse(mapping);if(!parsed||Array.isArray(parsed)||typeof parsed!=="object"||Object.values(parsed).some(value=>typeof value!=="string"))throw new Error(t("Ánh xạ cột phải là đối tượng JSON gồm các tên cột."));}
   const form=new FormData();form.set("file",chosen);form.set("mapping",mapping.trim()||"{}");
   const result=await api<Data>("/admin/order-imports","POST",form);
   setUploadedBatch({...result,filename:result.filename||chosen.name});setPage(1);view(result.id);
   void cache.invalidateQueries({predicate:query=>String(query.queryKey[0]==="page"?query.queryKey[1]:query.queryKey[0]).startsWith("/admin/order-imports")});
   setMessage(t("Đã tải báo cáo. Kiểm tra dữ liệu trước khi xác nhận nhập."));
   requestAnimationFrame(()=>{previewRegion.current?.focus({preventScroll:true});previewRegion.current?.scrollIntoView({block:"start"});});
  }catch(failure){setError(failure instanceof SyntaxError?t("Ánh xạ cột không phải JSON hợp lệ."):t((failure as Error).message));}
  finally{working.current=false;setBusy(false);}
 }
 function choose(chosen:File|null){if(working.current)return;setFile(chosen);setMappingDirty(false);if(chosen)void preview(chosen);}
 async function action(id:string,kind:"commit"|"retry"){
  if(working.current)return;working.current=true;setBusy(true);setError("");
  try{await ctx.act(`/admin/order-imports/${id}/${kind}`);setUploadedBatch(previous=>previous?.id===id?{...previous,status:"queued"}:previous);setMessage(t(kind==="commit"?"Đã xếp hàng nhập báo cáo. Kết quả sẽ tự cập nhật.":"Đã xếp hàng thử lại báo cáo."));}
  catch(failure){setError(t((failure as Error).message));}finally{working.current=false;setBusy(false);}
 }
 const counts=(row:Data)=><div className="import-history-counts">{Object.entries(row.counts||{}).map(([key,value])=><span key={key}><Status value={key}/><b className="num">{String(value)}</b></span>)}</div>;
 return <div className="stack import-workspace">
  <AdminUnsavedChanges dirty={mappingDirty||(!!file&&!!error&&!busy)}/>
  <ol className="import-steps" aria-label={t("Các bước nhập báo cáo")}>
   {["Chọn báo cáo","Kiểm tra dữ liệu","Xác nhận nhập"].map((label,index)=><li key={label} aria-current={index===currentStep?"step":undefined} className={completed||index<currentStep?"done":""}><span>{completed||index<currentStep?<Check size={16} aria-hidden="true"/>:index+1}</span><b>{t(label)}</b></li>)}
  </ol>
  <Card title={t("Tải báo cáo")}>
   <div className="import-upload-layout">
    <section className={"import-upload-zone"+(dragging?" dragging":"")} aria-busy={busy} onDragOver={event=>{event.preventDefault();if(!busy)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);choose(event.dataTransfer.files[0]||null);}}>
     <span className="import-file-icon"><FileSpreadsheet size={26} aria-hidden="true"/></span>
     <div><h3>{t("Chọn hoặc kéo thả báo cáo CSV")}</h3><p className="small mute">{t("Chọn file để tự động xem trước. Chỉ nhập đơn sau khi bạn xác nhận.")}</p></div>
     <label className="import-file-picker"><input className="import-file-input" aria-label={t("Chọn báo cáo CSV")} type="file" accept=".csv" disabled={busy} onChange={event=>choose(event.target.files?.[0]||null)}/><span><Upload size={16} aria-hidden="true"/>{t("Chọn báo cáo CSV")}</span></label>
     {file&&<p className="import-file-name"><FileSpreadsheet size={15} aria-hidden="true"/><b>{file.name}</b><span className="mute">{file.size<1024?file.size+" B":(file.size/1024).toFixed(1)+" KB"}</span></p>}
     {busy&&<p role="status" className="import-upload-progress"><Upload size={16} aria-hidden="true"/>{t("Đang xử lý…")}</p>}
     {file&&(error||mappingDirty)&&<button className="btn sm" disabled={busy} onClick={()=>void preview()}>{t(error?"Thử xem trước lại":"Cập nhật xem trước")}</button>}
    </section>
    <aside className="import-upload-help"><h3>{t("Báo cáo Shopee gốc")}</h3><p>{t("Giữ nguyên tên cột trong file xuất từ Shopee. Channel và hai trạng thái được đọc trực tiếp từ báo cáo.")}</p><p className="small mute">{t("CSV UTF-8 · tối đa 10 MB · 50.000 dòng")}</p><p className="small mute">{t("Giữ số tiền gốc để đối chiếu; làm tròn xuống đến đồng khi tính hoàn Xu.")}</p><a className="import-template-link" href="/templates/report-example.csv" download>{t("Tải file mẫu")}</a></aside>
   </div>
   <details className="import-advanced"><summary>{t("Ánh xạ cột nâng cao")}</summary><label className="field">{t("Ánh xạ cột (JSON)")}<textarea className="inp" disabled={busy} value={mapping} onChange={event=>{setMapping(event.target.value);setMappingDirty(true);}} placeholder='{"order_id":"Mã đơn"}'/></label><p className="small mute">{t("Để trống để dùng tên cột chuẩn. Chỉ chỉnh khi báo cáo có tên cột khác.")}</p></details>
  </Card>
  <AdminFeedback error={error} message={message}/>
  {selected&&<section ref={previewRegion} tabIndex={-1} className="import-preview" role="region" aria-label={t("Xem trước dữ liệu")}><Card title={t("Xem trước dữ liệu")}>
   <div className="import-preview-heading"><div><p className="import-preview-filename"><FileSpreadsheet size={17} aria-hidden="true"/><b>{batch?.filename||file?.name}</b></p><p className="small mute">{t("Kiểm tra trạng thái, hoa hồng và Channel trước khi nhập.")}</p></div><div className="row wrap">{batch&&<Status value={batch.status}/>}<button className="btn sm ghost" disabled={busy} onClick={()=>setSelected("")}>{t("Đóng xem trước")}</button></div></div>
   <dl className="import-summary">{[["Tổng dòng",total,""],[completed?"Đã nhập":"Sẵn sàng nhập",count("valid")+count("applied")+count("duplicate"),"ready"],["Cần sửa",count("invalid")+count("unmatched"),"attention"],["Bỏ qua",count("ignored"),""]].map(([label,value,tone])=><div className={String(tone)} key={label}><dt>{t(String(label))}</dt><dd>{Number(value).toLocaleString(language==="en"?"en-US":"vi-VN")}</dd></div>)}</dl>
   {rows.isPending?<AdminLoading/>:rows.error?<div role="alert"><p className="err">{t(rows.error.message)}</p><button className="btn sm ghost" onClick={()=>void rows.refetch()}>{t("Thử lại")}</button></div>:<div className="import-report-table"><Table responsive scrollLabel={t("Dòng báo cáo")} rows={rows.data||[]} columns={[
    {label:t("Dòng"),render:row=><span className="num">{row.number}</span>},
    {label:t("Đơn/sản phẩm"),render:row=><div className="import-product"><b>{row.payload?.productName||"—"}</b><small className="mute">{row.payload?.orderId||"—"}</small><details className="import-tracking-details"><summary>{t("Mã tracking")}</summary><code className="import-tracking">{row.payload?.trackingCode||"—"}</code></details></div>},
    {label:t("Giá trị đơn"),render:row=><ReportMoney value={row.payload?.reportedValue} fallback={row.payload?.value}/>},
    {label:t("Hoa hồng gốc"),render:row=><ReportMoney value={row.payload?.reportedCommission} fallback={row.payload?.commission}/>},
    {label:t("Kênh tiếp thị"),render:row=>row.payload?.reportChannel||"—"},
    {label:t("Trạng thái Shopee"),render:row=><div className="import-source-pair"><div><small className="mute">{t("Đơn hàng")}</small><ShopeeReportStatus value={row.payload?.shopeeOrderStatus} fallback={row.payload?.status}/></div><div><small className="mute">{t("Hoa hồng")}</small><ShopeeReportStatus value={row.payload?.affiliateItemStatus}/></div></div>},
    {label:t("Kết quả kiểm tra"),render:row=><div className="import-row-result"><Status value={row.status}/>{row.error&&<p className={"small "+(row.status==="invalid"?"err":"mute")}>{t(row.error)}</p>}{row.status==="unmatched"&&<button className="btn sm ghost" disabled={busy} onClick={()=>dialog(t("Khớp tracking từ bằng chứng"),[{name:"trackingCode",label:t("Tracking đúng có trong hệ thống")},{name:"reason",label:t("Bằng chứng/lý do")}],`/admin/order-imports/${selected}/rows/${row.number}/resolve`)}>{t("Khớp")}</button>}</div>},
   ]}/></div>}
   <CustomerPages page={rowPage} hasNext={!!rows.meta?.hasNext} busy={rows.isFetching} onPage={setRowPage}/>
   <div className="import-confirm-bar"><div><b>{t(hasInvalid?"Sửa lỗi dữ liệu trước khi nhập":"Đơn hoàn thành đủ điều kiện sẽ tự động cộng Xu")}</b><p className="small mute">{t("Đơn Pending tiếp tục chờ; đơn Cancelled không cộng Xu. Nhập lại không cộng trùng.")}</p></div>{batch?.status==="preview"&&<button className="btn" disabled={busy||rows.isPending||!!rows.error||hasInvalid||mappingDirty} onClick={()=>void action(selected,"commit")}>{t("Xác nhận nhập")}</button>}</div>
  </Card></section>}
  <Card title={t("Lịch sử nhập báo cáo")}><Table responsive scrollLabel={t("Lịch sử nhập báo cáo")} rows={rowData} columns={[
   {label:t("Ngày"),render:row=>date(row.createdAt)},{label:t("Tên file"),render:row=><span className="import-history-filename">{row.filename}</span>},
   {label:t("Trạng thái"),render:row=><><Status value={row.status}/>{row.error&&<p className="small err">{t(row.error)}</p>}</>},
   {label:t("Kết quả"),render:counts},{label:t("Thao tác"),render:row=><div className="row wrap"><button className="btn sm ghost" disabled={busy} onClick={()=>view(row.id)}>{t("Xem trước")}</button>{row.status==="failed"&&<button className="btn sm ghost" disabled={busy} onClick={()=>void action(row.id,"retry")}>{t("Thử lại")}</button>}</div>},
  ]}/>{pager}</Card>
 </div>;
}
