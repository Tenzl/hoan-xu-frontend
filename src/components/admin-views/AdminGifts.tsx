"use client";
import { useI18n } from "@/lib/i18n";
import { Card, Status, Table } from "../ui";
import type { AdminViewProps } from "./types";
export function AdminGifts({ gifts, rowData, dialog, pager, common }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <Card title={t("Yêu cầu đổi quà")}>
          <Table rows={rowData} columns={[
            ...common,
            { label: t("Quà"), render: (r) => r.giftName },
            { label: t("Xu"), render: (r) => r.costXu },
            {
                label: t("Trạng thái"),
                render: (r) => <Status value={r.status}/>,
            },
            {
                label: "",
                render: (r) => r.status === "pending" ? (<div className="row wrap">
                      <button className="btn sm" onClick={() => dialog(t("Cấp mã voucher"), [{ name: "code", label: t("Mã voucher") }], "/admin/gift-redemptions/" + r.id + "/events", {}, "POST", { action: "completed", reason: "" })}>
                        {t("Cấp mã")}
                      </button>
                      <button className="btn sm ghost" onClick={() => dialog(t("Từ chối đổi quà"), [{ name: "reason", label: t("Lý do") }], "/admin/gift-redemptions/" + r.id + "/events", {}, "POST", { action: "rejected", code: "" })}>
                        {t("Từ chối")}
                      </button>
                    </div>) : (r.reason),
            },
        ]}/>
          {pager}
        </Card>
        <Card title={t("Danh mục và tồn kho")}>
          <Table rows={gifts.data || []} columns={[
            { label: t("Quà"), render: (r) => r.name },
            { label: t("Xu"), render: (r) => r.costXu },
            { label: t("Tồn kho"), render: (r) => r.stock },
            {
                label: "",
                render: (r) => (<button className="btn sm ghost" onClick={() => dialog(t("Cập nhật quà"), [
                        { name: "name", label: t("Tên quà") },
                        {
                            name: "costXu",
                            label: t("Giá xu"),
                            type: "number",
                            min: 1,
                        },
                        {
                            name: "stock",
                            label: t("Mã còn trong kho"),
                            type: "number",
                        },
                        {
                            name: "active",
                            label: t("Đang mở đổi"),
                            type: "checkbox",
                        },
                    ], "/admin/gifts/" + r.id, r, "PATCH")}>
                    {t("Sửa")}
                  </button>),
            },
        ]}/>
        </Card>
      </div>);
}
