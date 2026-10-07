"use client";
import { useRef, useState } from "react";
import { money, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Status, Table, type Data } from "../ui";
import { AdminPanel, AdminFeedback, AdminLoading, AdminTabs, useAdminFormId } from "./admin-ui";
import type { AdminViewProps } from "./types";

export function AdminWithdrawals({ctx,rowData,dialog,event,pager,common,actionBusy,tab,setTab,setPage,data}:AdminViewProps){
 const {t}=useI18n();const id=useAdminFormId();
 const [selected,setSelected]=useState<Data|null>(null);const [reference,setReference]=useState("");const [evidence,setEvidence]=useState("");
 const [uncertain,setUncertain]=useState(false);
 const [filename,setFilename]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const [uploading,setUploading]=useState(false);const [dirty,setDirty]=useState(false);const sending=useRef(false);const request=useRef(0);
 function open(row:Data){request.current++;setUncertain(false);setSelected(row);setReference("");setEvidence("");setFilename("");setError("");setDirty(false);}
 function close(){if(busy||uploading)return;request.current++;setSelected(null);}
 async function upload(file:File){
  if(file.size>10*1024*1024 || !["image/png","image/jpeg","application/pdf"].includes(file.type)){setError(t("Chọn PNG, JPEG hoặc PDF, tối đa 10 MB."));return;}
  const generation=request.current;setUploading(true);setError("");
  try{const body=new FormData();body.set("file",file);const result=await ctx.act("/admin/private-files","POST",body);if(generation===request.current){setEvidence(result.id);setFilename(file.name);setDirty(true);}}
  catch(e){if(generation===request.current)setError(t((e as Error).message));}
  finally{setUploading(false);}
 }
 async function paid(e:React.FormEvent){
  e.preventDefault();if(sending.current||uploading||!selected||!evidence||!reference.trim())return;
  sending.current=true;setBusy(true);setError("");
  try{await ctx.act("/admin/withdrawals/"+selected.id+"/events","POST",{action:"paid",bankReference:reference.trim(),evidenceId:evidence,reason:""});setDirty(false);setSelected(null);}
  catch(e){setError(t((e as Error).message));if(e instanceof ApiError&&e.status>=500)setUncertain(true);}finally{sending.current=false;setBusy(false);}
 }
 return <div className="stack">
  <AdminTabs label="Trạng thái rút tiền" value={tab} onChange={value=>{setTab(value);setPage(1);}} options={[{value:"pending",label:"Chờ xử lý"},{value:"processing",label:"Đang xử lý"},{value:"paid",label:"Đã chuyển khoản"},{value:"rejected",label:"Từ chối"},{value:"",label:"Tất cả"}]}/>
  <Card>{data.isPending?<AdminLoading/>:data.error?<div role="alert"><p className="err">{t(data.error.message)}</p><button className="btn sm ghost" onClick={()=>void data.refetch()}>{t("Thử lại")}</button></div>:<Table responsive scrollLabel={t("Yêu cầu rút tiền")} rows={rowData} columns={[
   ...common,
   {label:t("Ngân hàng"),render:r=><><b>{r.bank}</b><p className="small">{r.account}</p><p className="small mute">{r.holder}</p></>},
   {label:t("Số tiền"),render:r=><span className="num">{money(r.amount)}</span>},
   {label:t("Trạng thái"),render:r=><><Status value={r.status}/>{r.status==="processing"&&r.processorId!==ctx.me?.id&&<p className="small mute">{t("Nhân viên khác đang xử lý")}</p>}</>},
   {label:t("Thao tác"),render:r=><div className="row wrap">
    {r.status==="pending"&&<button className="btn sm" disabled={data.isFetching||actionBusy} onClick={()=>void event("/admin/withdrawals/"+r.id+"/events","processing")}>{t("Nhận xử lý")}</button>}
    {r.status==="processing"&&r.processorId===ctx.me?.id&&<button className="btn sm" onClick={()=>open(r)}>{t("Ghi nhận chuyển khoản")}</button>}
    {["pending","processing"].includes(r.status)&&<button className="btn sm ghost" onClick={()=>dialog(t("Từ chối rút tiền"),[{name:"reason",label:t("Lý do")}],"/admin/withdrawals/"+r.id+"/events",{},"POST",{action:"rejected"})}>{t("Từ chối")}</button>}
    {r.evidenceId&&<a className="btn sm ghost" href={"/api/v1/private-files/"+r.evidenceId}>{t("Bằng chứng")}</a>}
   </div>},
  ]}/>}
  {pager}</Card>
  {selected&&<AdminPanel title={t("Xác nhận chuyển khoản")} dirty={dirty&&!busy&&!uploading} onClose={close}>
   <form className="stack" onSubmit={e=>void paid(e)}><fieldset disabled={busy}>
    <section className="admin-form-section"><h3>{selected.name}</h3><dl className="admin-detail-grid"><div><dt>{t("Số tiền")}</dt><dd>{money(selected.amount)}</dd></div><div><dt>{t("Ngân hàng")}</dt><dd>{selected.bank}</dd></div><div><dt>{t("Số tài khoản")}</dt><dd>{selected.account}</dd></div><div><dt>{t("Chủ tài khoản")}</dt><dd>{selected.holder}</dd></div></dl></section>
    <section className="admin-form-section">
     <label className="field" htmlFor={id+"reference"}>{t("Mã giao dịch ngân hàng")}<input id={id+"reference"} className="inp" disabled={uncertain} required maxLength={200} value={reference} onChange={e=>{setReference(e.target.value);setDirty(true);}}/></label>
     <label className="field" htmlFor={id+"file"}>{t("Bằng chứng chuyển khoản")}<input id={id+"file"} className="inp" type="file" disabled={uploading||uncertain} accept="image/png,image/jpeg,application/pdf" onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void upload(f);e.currentTarget.value="";}}/></label>
     <p className="small mute">{t("PNG, JPEG hoặc PDF, tối đa 10 MB.")}</p>
     {uploading&&<p role="status">{t("Đang tải bằng chứng…")}</p>}
     {evidence&&<p role="status">{t("Đã tải bằng chứng")}: <a href={"/api/v1/private-files/"+evidence} target="_blank" rel="noreferrer">{filename}</a></p>}
    </section>
    {uncertain&&<p className="note" role="status">{t("Kết quả chưa xác định. Gửi lại cùng dữ liệu để tránh tạo trùng.")}</p>}
    <p className="note">{t("Chỉ xác nhận sau khi đã chuyển khoản đúng số tiền và tài khoản ở trên.")}</p>
    <div className="admin-form-actions"><button className="btn" type="submit" disabled={uploading||!evidence||!reference.trim()}>{t(busy?"Đang xử lý…":"Xác nhận đã chuyển khoản")}</button></div>
   </fieldset><AdminFeedback error={error}/></form>
  </AdminPanel>}
 </div>;
}
