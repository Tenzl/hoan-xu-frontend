"use client";
import { useState } from "react";
import { AdminTabs, AdminUnsavedChanges, AdminFeedback } from "./admin-ui";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { XuExchangePolicy } from "../xu-exchange";
import { CashbackPolicy } from "../cashback-policy";
import { Card, Form, Status } from "../ui";
import { FAQEditor } from './FAQEditor';
import type { AdminViewProps } from "./types";
export function AdminSettings({ ctx, data, channelQ }: AdminViewProps) {
    const { t } = useI18n();
    const [section,setSection]=useState("general");
    const [dirty,setDirty]=useState(false);const [message,setMessage]=useState("");
    return (<div className="stack">
        <AdminUnsavedChanges dirty={dirty}/><AdminFeedback message={message}/>
        <AdminTabs label="Nhóm cài đặt" value={section} onChange={setSection} options={[{value:"general",label:"Thông tin chung"},{value:"cashback",label:"Chính sách hoàn Xu"},{value:"exchange",label:"Tỷ lệ đổi Xu"},{value:"support",label:"Nội dung hỗ trợ"},{value:"channels",label:"Kênh tiếp thị"}]}/>
        <div hidden={section!=="general"}>
        <Card title={t("Thông tin và chính sách")}>
          <Form onDirtyChange={()=>{setDirty(true);setMessage("");}} fields={[
            {
                name: "brand",
                label: t("Thương hiệu"),
                max: 30,
            },
            {
                name: "supportEmail",
                label: t("Email hỗ trợ"),
                required: false,
                type: "email",
            },
            {
                name: "maxDisplayPercent",
                label: t("Mức tối đa hiển thị (%) — để trống nếu chưa có cơ sở"),
                required: false,
            },
        ]} initial={{
            ...data.data,
            maxDisplayPercent: data.data?.maxDisplayPercent ?? "",
        }} submit={t("Lưu cài đặt")} onSubmit={async (v) => {
            try {
                await ctx.act("/admin/settings", "PUT", {
                    ...v,
                    maxDisplayPercent: v.maxDisplayPercent === ""
                        ? null
                        : Number(v.maxDisplayPercent),
                });
                setDirty(false);setMessage(t("Đã lưu cài đặt."));
            }
            catch { }
        }}/>
        </Card></div>
        <div hidden={section!=="cashback"}><CashbackPolicy ctx={ctx}/></div>
        <div hidden={section!=="exchange"}><XuExchangePolicy ctx={ctx}/></div>
        <div hidden={section!=="support"}><FAQEditor settings={data.data || {}} ctx={ctx}/></div>
        <div hidden={section!=="channels"} className="stack">
        {(channelQ.data || []).map((c) => (<Card title={c.name} key={c.id}>
            <div className="row between">
              <Status value={c.status}/>
              {c.id !== "shopee" ? (<span className="mute small">{t("Chưa cấu hình")}</span>) : (<Link className="btn sm ghost" href="/admin/cookies">{t("Kết nối Shopee")}</Link>)}
            </div>
            <p className="small mute">
              {t("Chỉ bật chạy thật khi tracking và quyền affiliate đã được kiểm chứng.")}
            </p>
          </Card>))}
        {channelQ.error && <div role="alert"><p className="err">{t(channelQ.error.message)}</p><button className="btn sm ghost" onClick={()=>void channelQ.refetch()}>{t("Thử lại")}</button></div>}
        </div>
      </div>);
}
