"use client";
import { useCallback, useRef, useState } from "react";
import { api, date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { SearchSelection, type SearchSelectionOption } from "@/lib/search-selection";
import { Card, Table, type Data } from "../ui";
import { AdminPanel, AdminFeedback, useAdminFormId } from "./admin-ui";
import type { AdminViewProps } from "./types";

export function AdminNotifications({ctx,rowData,pager}:AdminViewProps){
 const {t}=useI18n();const id=useAdminFormId();const [open,setOpen]=useState(false);const [review,setReview]=useState(false);
 const [audience,setAudience]=useState("all");const [recipient,setRecipient]=useState("");const [options,setOptions]=useState<readonly SearchSelectionOption[]>([]);
 const [title,setTitle]=useState("");const [body,setBody]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 const searchResults=useRef<readonly SearchSelectionOption[]>([]);
 const search=useCallback(async(query:string,signal:AbortSignal)=>{
  const rows=await api<Data[]>("/admin/notification-recipients?q="+encodeURIComponent(query)+"&perPage=20","GET",undefined,undefined,signal);
  const results=rows.map(row=>({value:row.id,label:row.name+(row.email?" · "+row.email:""),keywords:[row.email||""]}));searchResults.current=results;return results;
 },[]);
 const selected=options.find(option=>option.value===recipient);
 function compose(){setOpen(true);setReview(false);setAudience("all");setRecipient("");setOptions([]);setTitle("");setBody("");setError("");}
 async function send(){
  if(busy)return;setBusy(true);setError("");
  try{await ctx.act("/admin/notifications","POST",{recipientId:audience==="one"?recipient:"",title:title.trim(),body:body.trim()});setOpen(false);setMessage(t("Đã gửi thông báo."));}
  catch(e){setError(t((e as Error).message));}finally{setBusy(false);}
 }
 async function remove(row:Data){ctx.dialog({title:t("Xóa thông báo"),fields:[],submit:t("Xóa thông báo"),action:async()=>{await ctx.act("/admin/notifications/"+row.id,"DELETE");ctx.dialog(null);}});}
 return <div className="stack"><AdminFeedback message={message}/><Card>
  <div className="admin-toolbar"><h2>{t("Thông báo đã gửi")}</h2><button className="btn" onClick={compose}>{t("Soạn thông báo")}</button></div>
  <Table responsive scrollLabel={t("Thông báo đã gửi")} rows={rowData} columns={[
   {label:t("Ngày"),render:r=>date(r.createdAt)},{label:t("Tiêu đề"),render:r=>r.title},
   {label:t("Nội dung"),render:r=><details><summary className="admin-content-preview">{r.body}</summary><p>{r.body}</p></details>},
   {label:t("Người nhận"),render:r=>r.recipientId?r.recipientName||t("Một khách hàng"):t("Tất cả khách hàng")},
   {label:t("Thao tác"),render:r=><button className="btn sm ghost" onClick={()=>void remove(r)}>{t("Xóa thông báo")}</button>},
  ]}/>{pager}
 </Card>
 {open&&<AdminPanel title={t("Soạn thông báo")} dirty={!busy&&!!(title||body||recipient||audience!=="all")} onClose={()=>{if(!busy)setOpen(false);}}>
  <form className="stack" onSubmit={e=>{e.preventDefault();setError("");if(audience==="one"&&!recipient){setError(t("Chọn một khách hàng trước khi tiếp tục."));return;}if(!title.trim()||!body.trim()){setError(t("Nhập tiêu đề và nội dung thông báo."));return;}setReview(true);}}>
   <fieldset disabled={busy}>
   {review?<section className="stack"><h3>{t("Xem lại thông báo")}</h3><dl className="admin-detail-grid"><div><dt>{t("Người nhận")}</dt><dd>{audience==="all"?t("Tất cả khách hàng"):selected?.label?.split(" · ")[0]}{audience==="one"&&selected?.keywords?.[0]&&<p className="small mute">{selected.keywords[0]}</p>}</dd></div><div><dt>{t("Tiêu đề")}</dt><dd>{title}</dd></div></dl><p className="admin-code">{body}</p><div className="row wrap"><button className="btn ghost" type="button" onClick={()=>setReview(false)}>{t("Chỉnh sửa")}</button><button className="btn" type="button" onClick={()=>void send()}>{t(busy?"Đang xử lý…":"Gửi thông báo")}</button></div></section>:<section className="stack">
    <div className="field"><label htmlFor={id+"audience"}>{t("Người nhận")}</label><select id={id+"audience"} className="inp" value={audience} onChange={e=>{setAudience(e.target.value);setRecipient("");}}><option value="all">{t("Tất cả khách hàng")}</option><option value="one">{t("Một khách hàng")}</option></select></div>
    {audience==="one"&&<div className="field"><label htmlFor={id+"recipient"}>{t("Tìm người nhận")}</label><SearchSelection id={id+"recipient"} value={recipient} options={options} onChange={value=>{setRecipient(value);setOptions(searchResults.current.filter(option=>option.value===value));}} onSearch={search} placeholder={t("Tên hoặc email")} messages={{loading:t("Đang tìm…"),empty:t("Không tìm thấy khách hàng."),error:t("Không thể tìm kiếm. Vui lòng thử lại.")}}/></div>}
    <label className="field" htmlFor={id+"title"}>{t("Tiêu đề")}<input id={id+"title"} className="inp" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={80}/></label>
    <label className="field" htmlFor={id+"body"}>{t("Nội dung")}<textarea id={id+"body"} className="inp" value={body} onChange={e=>setBody(e.target.value)} required maxLength={1000} rows={6}/></label>
    <button className="btn" type="submit">{t("Xem lại thông báo")}</button>
   </section>}
   </fieldset><AdminFeedback error={error}/>
  </form>
 </AdminPanel>}
 </div>;
}
