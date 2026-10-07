"use client";
import { api, date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { AppContext } from "./app-context";
import { Card, Empty, type Data, type Field } from "./ui";
import dynamic from "next/dynamic";
const AdminCookies = dynamic(() => import('./admin-views/AdminCookies').then(m => m.AdminCookies), { loading: () => <p role="status">…</p> });
const AdminOverview = dynamic(() => import('./admin-views/AdminOverview').then(m => m.AdminOverview), { loading: () => <p role="status">…</p> });
const AdminOrders = dynamic(() => import('./admin-views/AdminOrders').then(m => m.AdminOrders), { loading: () => <p role="status">…</p> });
const AdminWithdrawals = dynamic(() => import('./admin-views/AdminWithdrawals').then(m => m.AdminWithdrawals), { loading: () => <p role="status">…</p> });
const AdminUsers = dynamic(() => import('./admin-views/AdminUsers').then(m => m.AdminUsers), { loading: () => <p role="status">…</p> });
const AdminGifts = dynamic(() => import('./admin-views/AdminGifts').then(m => m.AdminGifts), { loading: () => <p role="status">…</p> });
const AdminDeals = dynamic(() => import('./admin-views/AdminDeals').then(m => m.AdminDeals), { loading: () => <p role="status">…</p> });
const AdminNotifications = dynamic(() => import('./admin-views/AdminNotifications').then(m => m.AdminNotifications), { loading: () => <p role="status">…</p> });
const AdminSettings = dynamic(() => import('./admin-views/AdminSettings').then(m => m.AdminSettings), { loading: () => <p role="status">…</p> });
const AdminAccounts = dynamic(() => import('./admin-views/AdminAccounts').then(m => m.AdminAccounts), { loading: () => <p role="status">…</p> });
const AdminImports = dynamic(() => import('./admin-views/AdminImports').then(m => m.AdminImports), { loading: () => <p role="status">…</p> });
const AdminAudit = dynamic(() => import('./admin-views/AdminAudit').then(m => m.AdminAudit), { loading: () => <p role="status">…</p> });
export function AdminScreen({ path, ctx }: {
    path: string;
    ctx: AppContext;
}) {
    const { t } = useI18n();
    const [page, setPage] = useState(1);
    const [tab, setTab] = useState("pending");
    const [selected, setSelected] = useState("");
    const [mapping, setMapping] = useState("{}");
    const endpoint = path === "/admin"
        ? "/admin/dashboard"
        : path === "/admin/orders"
            ? "/admin/orders?status=" + tab + "&page=" + page
            : path === "/admin/imports"
                ? "/admin/order-imports?page=" + page
                : path === "/admin/withdrawals"
                    ? "/admin/withdrawals?page=" + page
                    : path === "/admin/users"
                        ? "/admin/users?page=" + page
                        : path === "/admin/gifts"
                            ? "/admin/gift-redemptions?page=" + page
                            : path === "/admin/deals"
                                ? "/admin/deals?page=" + page
                                : path === "/admin/notifications"
                                    ? "/admin/notifications?page=" + page
                                    : path === "/admin/settings"
                                        ? "/admin/settings"
                                        : path === "/admin/cookies"
                                            ? "/admin/browser"
                                            : path === "/admin/accounts"
                                                ? "/admin/internal-accounts?page=" + page
                                                : "/admin/audit-logs?page=" + page;
    const data = usePagedQuery<any>(endpoint, true, path === "/admin/imports" ? 3000 : path === "/admin/cookies" ? 5000 : false, ctx.me?.id);
    const gifts = useQuery<Data[]>({
        queryKey: ["/admin/gifts"],
        queryFn: () => api("/admin/gifts"),
        enabled: path === "/admin/gifts",
    });
    const channelQ = useQuery<Data[]>({
        queryKey: ["/admin/affiliate-channels"],
        queryFn: () => api("/admin/affiliate-channels"),
        enabled: path === "/admin/settings",
    });
    const rows = useQuery<Data[]>({
        queryKey: ["/admin/order-imports/" + selected + "/rows"],
        queryFn: () => api("/admin/order-imports/" + selected + "/rows?perPage=100"),
        enabled: path === "/admin/imports" && !!selected,
    });
    const ledger = useQuery<Data[]>({
        queryKey: ["/admin/ledger-check"],
        queryFn: () => api("/admin/ledger-check"),
        enabled: path === "/admin/audit",
    });
    const rowData: Data[] = Array.isArray(data.data) ? data.data : [];
    function dialog(title: string, fields: Field[], endpoint: string, initial: Data = {}, method = "POST", extra: Data = {}) {
        ctx.dialog({
            title,
            fields,
            initial,
            submit: t("Xác nhận"),
            action: async (v) => {
                await ctx.act(endpoint, method, { ...extra, ...v });
                ctx.dialog(null);
            },
        });
    }
    async function event(endpoint: string, action: string) {
        try {
            await ctx.act(endpoint, "POST", { action, reason: "" });
        }
        catch { }
    }
    const common = [
        {
            label: t("Ngày"),
            render: (r: Data) => date(r.createdAt || r.orderedAt),
        },
        {
            label: t("Người dùng"),
            render: (r: Data) => (<>
          <b>{r.name}</b>
          <p className="small mute">{r.userId}</p>
        </>),
        },
    ];
    if (data.isPending)
        return (<Card>
        <p role="status">{t("Đang tải dữ liệu quản trị…")}</p>
      </Card>);
    if (data.error)
        return (<Card>
        <p className="err" role="alert">
          {t(data.error.message)}
        </p>
        <button className="btn sm ghost" onClick={() => data.refetch()}>
          {t("Thử lại")}
        </button>
      </Card>);
    const pager = (<div className="row between pager">
      <button className="btn sm ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>
        {t("← Trước")}
      </button>
      <span className="small mute">
        {t("Trang")} {page}
      </span>
      <button className="btn sm ghost" disabled={!data.meta?.hasNext || data.isFetching} onClick={() => setPage(page + 1)}>
        {t("Tiếp →")}
      </button>
    </div>);
    const viewProps = { path, ctx, data, gifts, channelQ, rows, ledger, rowData, page, setPage, tab, setTab, selected, setSelected, mapping, setMapping, dialog, event, common, pager };
    if (path === "/admin/cookies")
        return <AdminCookies {...viewProps}/>;
    if (path === "/admin")
        return <AdminOverview {...viewProps}/>;
    if (path === "/admin/orders")
        return <AdminOrders {...viewProps}/>;
    if (path === "/admin/withdrawals")
        return <AdminWithdrawals {...viewProps}/>;
    if (path === "/admin/users")
        return <AdminUsers {...viewProps}/>;
    if (path === "/admin/gifts")
        return <AdminGifts {...viewProps}/>;
    if (path === "/admin/deals")
        return <AdminDeals {...viewProps}/>;
    if (path === "/admin/notifications")
        return <AdminNotifications {...viewProps}/>;
    if (path === "/admin/settings")
        return <AdminSettings {...viewProps}/>;
    if (path === "/admin/accounts")
        return <AdminAccounts {...viewProps}/>;
    if (path === "/admin/imports")
        return <AdminImports {...viewProps}/>;
    if (path === "/admin/audit")
        return <AdminAudit {...viewProps}/>;
    return (<Card>
      <Empty text={t("Không tìm thấy trang quản trị.")}/>
    </Card>);
}
