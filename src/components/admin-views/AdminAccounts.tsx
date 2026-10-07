"use client";
import { useI18n } from "@/lib/i18n";
import { Card, Form, Table } from "../ui";
import { permissionNames } from "./constants";
import type { AdminViewProps } from "./types";
export function AdminAccounts({ ctx, rowData, pager }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <Card title={t("Tạo tài khoản nội bộ")}>
          <Form fields={[
            { name: "username", label: "Username" },
            { name: "name", label: t("Tên hiển thị") },
            {
                name: "password",
                label: t("Mật khẩu tạm (12–128 ký tự)"),
                type: "password",
                max: 128,
            },
            {
                name: "role",
                label: t("Vai trò"),
                options: [
                    { value: "staff", label: t("Nhân viên") },
                    { value: "admin", label: t("Quản trị") },
                ],
            },
            {
                name: "permissions",
                label: t("Quyền staff (phân cách dấu phẩy)"),
                required: false,
                placeholder: permissionNames.join(","),
            },
        ]} submit={t("Tạo tài khoản")} onSubmit={async (v) => {
            try {
                await ctx.act("/admin/internal-accounts", "POST", {
                    ...v,
                    permissions: String(v.permissions)
                        .split(",")
                        .map((p) => p.trim())
                        .filter(Boolean),
                });
            }
            catch { }
        }}/>
        </Card>
        <Card title={t("Tài khoản đã cấp")}>
          <Table rows={rowData} columns={[
            { label: "Username", render: (r) => r.username },
            { label: t("Tên"), render: (r) => r.name },
            { label: t("Vai trò"), render: (r) => r.role },
            {
                label: t("Quyền"),
                render: (r) => (r.permissions || []).join(", "),
            },
            {
                label: t("Trạng thái"),
                render: (r) => r.blocked
                    ? t("Khóa")
                    : r.mustChangePassword
                        ? t("Cần đổi mật khẩu")
                        : t("Hoạt động"),
            },
            {
                label: "",
                render: (r) => r.id !== ctx.me?.id && (<button className="btn sm ghost" onClick={() => ctx.dialog({
                        title: t("Reset tài khoản và quyền"),
                        fields: [
                            {
                                name: "password",
                                label: t("Mật khẩu tạm mới"),
                                type: "password",
                            },
                            {
                                name: "permissions",
                                label: t("Quyền staff (dấu phẩy)"),
                                required: false,
                            },
                            {
                                name: "blocked",
                                label: t("Khóa tài khoản"),
                                type: "checkbox",
                            },
                        ],
                        initial: {
                            permissions: (r.permissions || []).join(","),
                            blocked: r.blocked,
                        },
                        submit: t("Reset và thu hồi phiên"),
                        action: async (v) => {
                            await ctx.act("/admin/internal-accounts/" + r.id + "/reset", "POST", {
                                ...v,
                                permissions: String(v.permissions)
                                    .split(",")
                                    .map((p) => p.trim())
                                    .filter(Boolean),
                            });
                            ctx.dialog(null);
                        },
                    })}>
                      {t("Reset/quyền")}
                    </button>),
            },
        ]}/>
          {pager}
        </Card>
      </div>);
}
