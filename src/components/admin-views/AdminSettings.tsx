"use client";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { CashbackPolicy } from "../cashback-policy";
import { Card, Form, Status } from "../ui";
import { FAQEditor } from './FAQEditor';
import type { AdminViewProps } from "./types";
export function AdminSettings({ ctx, data, channelQ }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <Card title={t("Thông tin và chính sách")}>
          <Form fields={[
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
            }
            catch { }
        }}/>
        </Card>
        <CashbackPolicy ctx={ctx}/>
        <FAQEditor settings={data.data || {}} ctx={ctx}/>
        {(channelQ.data || []).map((c) => (<Card title={c.name} key={c.id}>
            <div className="row between">
              <Status value={c.status}/>
              {c.id !== "shopee" ? (<span className="mute small">{t("Chưa cấu hình")}</span>) : (<Link className="btn sm ghost" href="/admin/cookies">{t("Kết nối Shopee")}</Link>)}
            </div>
            <p className="small mute">
              {t("Chỉ bật chạy thật khi tracking và quyền affiliate đã được kiểm chứng.")}
            </p>
          </Card>))}
      </div>);
}
