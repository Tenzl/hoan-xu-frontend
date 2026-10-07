"use client";
import { useState } from "react";
import { date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Table, type Data } from "../ui";
import { AdminPanel, AdminTabs, AdminLoading } from "./admin-ui";
import type { AdminViewProps } from "./types";

import { auditActions as actions, auditResource, ledgerKinds } from "./admin-audit-labels";
export function AdminAudit({ledger,rowData,pager}:AdminViewProps){
 const {t,language}=useI18n();const [section,setSection]=useState("log");const [selected,setSelected]=useState<Data|null>(null);
 const amount=(value:number)=>Number(value||0).toLocaleString(language==="en"?"en-US":"vi-VN")+" Xu";
 return <div className="stack"><AdminTabs label="Nhật ký và số dư" value={section} onChange={setSection} options={[{value:"log",label:"Nhật ký thao tác"},{value:"ledger",label:"Kiểm tra số dư"}]}/>
  {section==="log"?<Card><Table responsive scrollLabel={t("Nhật ký thao tác")} rows={rowData} columns={[
   {label:t("Ngày"),render:r=>date(r.createdAt)},{label:t("Người thực hiện"),render:r=>r.actorName||t("Hệ thống")},
   {label:t("Thao tác"),render:r=>t(actions[r.action]||"Thao tác khác")},{label:t("Đối tượng"),render:r=>t(auditResource(r.action))},
   {label:t("Chi tiết"),render:r=><button className="btn sm ghost" onClick={()=>setSelected(r)}>{t("Chi tiết")}</button>},
  ]}/>{pager}</Card>:<Card title={t("Kiểm tra số dư")}>
   {ledger.isPending?<AdminLoading/>:ledger.error?<div role="alert"><p className="err">{t(ledger.error.message)}</p><button className="btn sm ghost" onClick={()=>void ledger.refetch()}>{t("Thử lại")}</button></div>:ledger.data?.length?<Table responsive rows={ledger.data} scrollLabel={t("Số dư chênh lệch")} columns={[
    {label:t("Tài khoản"),render:r=><details><summary>{t(ledgerKinds[r.kind]||"Tài khoản Xu")}</summary><code className="small">{r.accountId}</code></details>},{label:t("Số dư"),render:r=><span className="num">{amount(r.balance)}</span>},{label:t("Theo sổ giao dịch"),render:r=><span className="num">{amount(r.ledgerBalance)}</span>},
   ]}/>:<p className="pill ok">{t("Số dư khớp với sổ giao dịch")}</p>}
  </Card>}
  {selected&&<AdminPanel title={t("Chi tiết thao tác quản trị")} onClose={()=>setSelected(null)}><dl className="admin-detail-grid"><div><dt>{t("Người thực hiện")}</dt><dd>{selected.actorName||t("Hệ thống")}</dd></div><div><dt>{t("Ngày")}</dt><dd>{date(selected.createdAt)}</dd></div><div><dt>{t("Mã người thực hiện")}</dt><dd>{selected.actorId||"—"}</dd></div><div><dt>{t("Thao tác")}</dt><dd>{t(actions[selected.action]||"Thao tác khác")}</dd></div></dl><details><summary>{t("Dữ liệu kỹ thuật")}</summary><pre className="admin-code">{JSON.stringify({action:selected.action,resource:selected.resource,payload:selected.payload},null,2)}</pre></details></AdminPanel>}
 </div>;
}
