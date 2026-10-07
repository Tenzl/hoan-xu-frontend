"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api-schema";
import { api, date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { previewPeriod } from "@/lib/membership-policy";
import { AdminUnsavedChanges } from "./admin-views/admin-ui";
import { Card } from "./ui";
import type { AppContext } from "./app-context";
type Policy = components["schemas"]["CashbackPolicy"];
export function CashbackPolicy({ ctx }: { ctx: AppContext }) {
 const {t}=useI18n();
 const q=useQuery<Policy>({queryKey:["/admin/cashback-policies/current",ctx.me?.id],queryFn:()=>api("/admin/cashback-policies/current")});
 if(q.isPending) return <Card title={t("Chính sách hạng theo kỳ")}><p role="status">{t("Đang tải dữ liệu…")}</p></Card>;
 if(q.error || q.data?.tiers?.length!==4) return <Card title={t("Chính sách hạng theo kỳ")}><p role="alert">{q.error?.message || t("Chưa tải được chính sách hạng.")}</p><button className="btn ghost" onClick={()=>void q.refetch()}>{t("Thử lại")}</button></Card>;
 return <PolicyEditor key={q.data.id} policy={q.data} ctx={ctx} reload={()=>void q.refetch()}/>;
}
function PolicyEditor({policy,ctx,reload}:{policy:Policy;ctx:AppContext;reload:()=>void}) {
 const {t,language}=useI18n();
 const [rows,setRows]=useState(policy.tiers.map(r=>({...r,minGoldTotal:String(r.minGoldTotal),exchangeBonusPercent:String(r.exchangeBonusPercent),minSharePercent:String(r.minSharePercent),maxSharePercent:String(r.maxSharePercent)})));
 const [months,setMonths]=useState(String(policy.periodMonths)); const [anchor,setAnchor]=useState(policy.anchorDate);
 const [basis,setBasis]=useState(policy.dateBasis); const [tax,setTax]=useState(String(policy.taxPercent));
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const [dirty,setDirty]=useState(false);
 const calendar=previewPeriod(Number(months),anchor);
 const number=(n: string)=>Number(n).toLocaleString(language==="en"?"en-US":"vi-VN");
 function update(i:number,k:string,v:string){setRows(rows.map((r,n)=>n===i?{...r,[k]:v}:r));setError("");}
 async function save(){
  if(busy)return;
  const whole=(s:string,max:number)=>/^\d+$/.test(s)&&Number.isSafeInteger(Number(s))&&Number(s)<=max;
  const narrow=rows.some((r,i)=>Number(r.maxSharePercent)-Number(r.minSharePercent)<5&&!(Number(r.minSharePercent)===policy.tiers[i].minSharePercent&&Number(r.maxSharePercent)===policy.tiers[i].maxSharePercent));
  if(narrow){setError(t("Khoảng tỷ lệ phải rộng ít nhất 5 điểm phần trăm."));return;}
  const invalid=rows.some((r,i)=>!r.nameVi.trim()||!r.nameEn.trim()||Array.from(r.nameVi.trim()).length>40||Array.from(r.nameEn.trim()).length>40||!whole(r.minGoldTotal,1e12)||(i===0?Number(r.minGoldTotal)!==0:Number(r.minGoldTotal)<=Number(rows[i-1].minGoldTotal))||!whole(r.exchangeBonusPercent,100)||!whole(r.minSharePercent,100)||!whole(r.maxSharePercent,100)||(Number(r.maxSharePercent)-Number(r.minSharePercent)<5&&!(Number(r.minSharePercent)===policy.tiers[i].minSharePercent&&Number(r.maxSharePercent)===policy.tiers[i].maxSharePercent)));
  if(invalid||!whole(months,12)||Number(months)<1||!calendar||!/^\d{1,3}(\.\d{1,2})?$/.test(tax)||Number(tax)>100){setError(t("Kiểm tra tên, ngưỡng tăng dần, tỷ lệ và chu kỳ hợp lệ."));return;}
  setBusy(true);setError("");
  try{await ctx.act("/admin/cashback-policies","POST",{currentVersionId:policy.id,periodMonths:Number(months),anchorDate:anchor,dateBasis:basis,taxPercent:Number(tax),tiers:rows.map(r=>({...r,nameVi:r.nameVi.trim(),nameEn:r.nameEn.trim(),minGoldTotal:Number(r.minGoldTotal),exchangeBonusPercent:Number(r.exchangeBonusPercent),minSharePercent:Number(r.minSharePercent),maxSharePercent:Number(r.maxSharePercent)}))});setDirty(false);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Card title={t("Chính sách hạng theo kỳ")}>
  <AdminUnsavedChanges dirty={dirty&&!busy}/>
  <p className="small mute">{t("Phiên bản")}: {policy.id} · {date(policy.createdAt)}</p>
  <p className="note">{t("Hạng được xét theo tiền hoàn trong kỳ. Lưu cấu hình sẽ tính lại hạng của mọi khách; link và giao dịch đã chốt giữ nguyên quyền lợi.")}</p>
  <form className="stack" onChange={()=>setDirty(true)} onSubmit={e=>{e.preventDefault();void save();}}>
   <fieldset className="stack" disabled={busy}>
    <legend>{t("Chu kỳ xét hạng")}</legend>
    <label className="field">{t("Độ dài chu kỳ (tháng)")}<input className="inp" type="number" min={1} max={12} step={1} required value={months} onChange={e=>setMonths(e.target.value)}/></label>
    <label className="field">{t("Ngày mốc bắt đầu")}<input className="inp" type="date" required value={anchor} onChange={e=>setAnchor(e.target.value)}/></label>
    <label className="field">{t("Ngày dùng để tính kỳ")}<select className="inp" value={basis} onChange={e=>setBasis(e.target.value as Policy["dateBasis"])}><option value="approved">{t("Ngày duyệt hoàn")}</option><option value="ordered">{t("Ngày đặt đơn")}</option></select></label>
    <label className="field">{t("Phần trăm thuế (%)")}<input className="inp" type="number" min={0} max={100} step="0.01" required value={tax} onChange={e=>setTax(e.target.value)}/></label>
   </fieldset>
   <div className="tier-policy-grid">{rows.map((r,i)=><fieldset className="tier-policy-row stack" key={r.tierCode} disabled={busy}>
    <legend>{language==="en"?r.nameEn:r.nameVi}</legend>
    <label className="field">{t("Tên hạng (Việt)")}<input className="inp" maxLength={40} required value={r.nameVi} onChange={e=>update(i,"nameVi",e.target.value)}/></label>
    <label className="field">{t("Tên hạng (Anh)")}<input className="inp" maxLength={40} required value={r.nameEn} onChange={e=>update(i,"nameEn",e.target.value)}/></label>
    <label className="field">{t("Hoàn vàng tối thiểu trong kỳ")}<input className="inp" type="number" min={0} max={1e12} step={1} required readOnly={i===0} value={r.minGoldTotal} onChange={e=>update(i,"minGoldTotal",e.target.value)}/></label>
    <label className="field">{t("Thưởng đổi Xu (%)")}<input className="inp" type="number" min={0} max={100} step={1} required value={r.exchangeBonusPercent} onChange={e=>update(i,"exchangeBonusPercent",e.target.value)}/></label>
    <label className="field">{t("Tỷ lệ tối thiểu (%)")}<input className="inp" type="number" min={0} max={100} step={1} required value={r.minSharePercent} onChange={e=>update(i,"minSharePercent",e.target.value)}/></label>
    <label className="field">{t("Tỷ lệ tối đa (%)")}<input className="inp" type="number" min={0} max={100} step={1} required value={r.maxSharePercent} onChange={e=>update(i,"maxSharePercent",e.target.value)}/></label>
   </fieldset>)}</div>
   <div className="note stack" role="region" aria-label={t("Xem trước chính sách")}>
    {calendar&&<p>{t("Kỳ hiện tại")}: {calendar.start} → {calendar.end} ({t("không gồm ngày kết thúc")})</p>}
    {rows.map(r=><p key={r.tierCode}>{language==="en"?r.nameEn:r.nameVi}: {number(r.minGoldTotal)} Xu · {t("Thưởng đổi Xu")}: +{r.exchangeBonusPercent}% · {t("Tỷ lệ hoàn mua hàng")}: {r.minSharePercent}–{r.maxSharePercent}%</p>)}
    <p>{t("Tổng Xu vàng trọn đời và số dư không đặt lại khi sang kỳ.")}</p>
    <button className="btn" type="submit" disabled={busy}>{t(busy?"Đang lưu…":"Lưu chính sách mới")}</button>
   </div>
  </form>
  {error&&<div><p className="err" role="alert">{t(error)}</p><button className="btn ghost" onClick={reload}>{t("Tải lại chính sách")}</button></div>}
 </Card>;
}
