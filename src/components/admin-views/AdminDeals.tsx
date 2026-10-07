"use client";
import { useI18n } from "@/lib/i18n";
import { Card, Table } from "../ui";
import type { AdminViewProps } from "./types";
export function AdminDeals({ rowData, dialog, pager, common }: AdminViewProps) {
    const { t } = useI18n();
    return (<Card>
        <Table responsive scrollLabel={t("Bài đăng cộng đồng")} rows={rowData} columns={[
            ...common,
            { label: t("Nội dung"), render: (r) => <details><summary className="admin-content-preview">{r.body}</summary><p>{r.body}</p></details> },
            { label: t("Kênh"), render: (r) => r.channel },
            { label: t("Hữu ích"), render: (r) => r.likes },
            {
                label: t("Trạng thái"),
                render: (r) => r.deleted
                    ? t("Đã xóa")
                    : r.hidden
                        ? t("Đang ẩn")
                        : t("Đang hiện"),
            },
            {
                label: t("Thao tác"),
                render: (r) => !r.deleted && (<div className="row wrap">
                    <button className="btn sm ghost" onClick={() => dialog(r.hidden ? t("Hiện bài") : t("Ẩn bài"), [{ name: "reason", label: t("Lý do") }], "/admin/deals/" + r.id + "/events", {}, "POST", { action: r.hidden ? "show" : "hide" })}>
                      {r.hidden ? t("Hiện") : t("Ẩn")}
                    </button>
                    <button className="btn sm ghost" onClick={() => dialog(t("Xóa bài đăng"), [{ name: "reason", label: t("Lý do") }], "/admin/deals/" + r.id + "/events", {}, "POST", { action: "delete" })}>
                      {t("Xóa")}
                    </button>
                  </div>),
            },
        ]}/>
        {pager}
      </Card>);
}
