"use client";
import { date, money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Table } from "../ui";
import type { AdminViewProps } from "./types";
export function AdminUsers({ rowData, dialog, pager }: AdminViewProps) {
    const { t } = useI18n();
    return (<Card>
        <Table rows={rowData} columns={[
            {
                label: t("Khách"),
                render: (r) => (<>
                  <b>{r.name}</b>
                  <p className="small mute">{r.email}</p>
                </>),
            },
            { label: "Tham gia", render: (r) => date(r.createdAt) },
            {
                label: t("Khả dụng"),
                render: (r) => money(r.available),
            },
            { label: t("Tạm giữ"), render: (r) => money(r.held) },
            { label: t("Giữ Xu đổi quà"), render: (r) => money(r.giftHeld) },
            {
                label: t("Trạng thái"),
                render: (r) => (r.blocked ? t("Đã khóa") : t("Hoạt động")),
            },
            {
                label: "",
                render: (r) => (<button className="btn sm ghost" onClick={() => dialog(r.blocked ? t("Mở khóa khách") : t("Khóa khách"), [{ name: "reason", label: t("Lý do") }], "/admin/users/" + r.id, {}, "PATCH", { blocked: !r.blocked })}>
                  {r.blocked ? t("Mở khóa") : t("Khóa")}
                </button>),
            },
        ]}/>
        {pager}
      </Card>);
}
