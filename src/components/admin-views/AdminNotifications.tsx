"use client";
import { date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Form, Table } from "../ui";
import type { AdminViewProps } from "./types";
export function AdminNotifications({ ctx, rowData, pager }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <Card title={t("Gửi thông báo")}>
          <Form fields={[
            {
                name: "recipientId",
                label: t("User ID nhận (trống = mọi khách)"),
                required: false,
            },
            { name: "title", label: t("Tiêu đề"), max: 80 },
            {
                name: "body",
                label: t("Nội dung"),
                type: "textarea",
                max: 1000,
            },
        ]} submit={t("Gửi thông báo")} onSubmit={async (v) => {
            try {
                await ctx.act("/admin/notifications", "POST", v);
            }
            catch { }
        }}/>
        </Card>
        <Card title={t("Đã gửi")}>
          <Table rows={rowData} columns={[
            { label: t("Ngày"), render: (r) => date(r.createdAt) },
            { label: t("Tiêu đề"), render: (r) => r.title },
            { label: t("Nội dung"), render: (r) => r.body },
            {
                label: t("Người nhận"),
                render: (r) => r.recipientId || t("Mọi khách"),
            },
            {
                label: "",
                render: (r) => (<button className="btn sm ghost" onClick={async () => {
                        try {
                            await ctx.act("/admin/notifications/" + r.id, "DELETE");
                        }
                        catch { }
                    }}>
                    {t("Xóa mềm")}
                  </button>),
            },
        ]}/>
          {pager}
        </Card>
      </div>);
}
