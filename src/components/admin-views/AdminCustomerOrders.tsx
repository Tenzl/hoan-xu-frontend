"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type User } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import type { AppContext } from "../app-context";
import { Card, Empty, Form, Status, Table } from "../ui";
import { AdminOrderDetail, type AdminOrder } from "./AdminOrderDetail";
import { LegacyOrderBatch, LegacyOrderExample } from "./LegacyOrderBatch";
import { CustomerRank } from "../weekly-prizes";
import { AdminPanel } from "./admin-ui";

export function canManageCustomerOrders(me?: User) {
  return me?.role === "admin" || (me?.role === "staff" && !!me.permissions?.includes("users") && !!me.permissions?.includes("orders"));
}

export function CustomerPages({ page, hasNext, busy, onPage }: { page: number; hasNext: boolean; busy: boolean; onPage: (value: number) => void }) {
  const { t } = useI18n();
  return <div className="row between pager">
    <button className="btn sm ghost" disabled={page === 1 || busy} onClick={() => onPage(page - 1)}>{t("← Trước")}</button>
    <span className="small mute">{t("Trang")} {page}</span>
    <button className="btn sm ghost" disabled={!hasNext || busy} onClick={() => onPage(page + 1)}>{t("Tiếp →")}</button>
  </div>;
}

function orderTime(value: string, language: string) {
  return new Date(value).toLocaleString(language === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
}

function QueryError({ error, retry }: { error: Error; retry: () => void }) {
  const { t } = useI18n();
  return <div role="alert"><p className="err">{t(error.message)}</p><button className="btn sm ghost" onClick={retry}>{t("Thử lại")}</button></div>;
}

function LegacyCustomerForm({ mode, name, endpoint, ctx, onClose }: { mode: "name" | "order"; name: string; endpoint: string; ctx: AppContext; onClose: () => void }) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderedAt] = useState(() => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 16));
  return <AdminPanel title={mode === "name" ? t("Sửa tên") : t("Thêm đơn cho khách cũ")} dirty={dirty && !busy} onClose={() => { if (!busy) onClose(); }}>
    {error && <p className="err" role="alert">{t(error)}</p>}
    {mode === "order" && <p className="small mute customer-form-note">{t("Đơn được duyệt và ghi nhận Xu vàng ngay khi lưu.")}</p>}
    <Form busy={busy} onDirtyChange={() => setDirty(true)} initial={mode === "name" ? { name } : { orderedAt }} fields={mode === "name" ? [{ name: "name", label: t("Tên khách hàng"), max: 80 }] : [
      { name: "productName", label: t("Sản phẩm"), max: 200 },
      { name: "orderedAt", label: t("Ngày giờ đặt (GMT+7)"), type: "datetime-local" },
      { name: "cashback", label: t("Số Xu hoàn"), type: "number", min: 1, max: 1e12, step: 1 },
      { name: "note", label: t("Ghi chú"), type: "textarea", required: false, max: 500 },
    ]} submit={mode === "name" ? t("Lưu tên") : t("Thêm đơn")} onSubmit={async values => {
      setError(""); setBusy(true);
      try {
        if (mode === "order" && !Number.isSafeInteger(values.cashback)) throw new Error(t("Số Xu hoàn phải là số nguyên."));
        const body = mode === "name" ? { name: values.name.trim() } : { productName: values.productName.trim(), orderedAt: values.orderedAt + (values.orderedAt.length === 16 ? ":00" : "") + "+07:00", cashback: values.cashback, note: values.note.trim() };
        await ctx.act(endpoint, mode === "name" ? "PATCH" : "POST", body);
        onClose();
      } catch (error) { setError((error as Error).message); } finally { setBusy(false); }
    }} />
  </AdminPanel>;
}

export function AdminCustomerOrders({ userId, legacy, ctx }: { userId: string; legacy: boolean; ctx: AppContext }) {
  const { t, language } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const defaultReturn = legacy ? "/admin/legacy-users" : "/admin/users";
  const candidate = params.get("returnTo") || "";
  const returnTo = candidate === defaultReturn || candidate.startsWith(defaultReturn + "?") ? candidate : defaultReturn;
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState<"name" | "order" | "batch" | null>(null);
  const allowed = canManageCustomerOrders(ctx.me);
  const base = `/admin/users/${encodeURIComponent(userId)}`;
  const customer = useQuery<components["schemas"]["AdminCustomer"]>({ queryKey: [base, ctx.me?.id], queryFn: ({ signal }) => api(base, "GET", undefined, undefined, signal), enabled: allowed });
  const correctGroup = !!customer.data && (customer.data.kind === "legacy") === legacy;
  const orders = usePagedQuery<AdminOrder[]>(`${base}/orders?status=${status}&page=${page}&perPage=20`, allowed && correctGroup, false, ctx.me?.id);
  useEffect(() => {
    if (customer.data && !correctGroup) router.replace(`/admin/${customer.data.kind === "legacy" ? "legacy-users" : "users"}/${encodeURIComponent(userId)}/orders`);
  }, [customer.data, correctGroup, router, userId]);
  const back = <Link className="btn sm ghost" href={returnTo}>{t("← Danh sách khách hàng")}</Link>;
  if (!allowed) return <Card><p className="err" role="alert">{t("Bạn không có quyền.")}</p>{back}</Card>;
  if (customer.error) return <Card>{back}<QueryError error={customer.error} retry={() => void customer.refetch()} /></Card>;
  if (customer.isPending || !correctGroup) return <Card>{back}<p role="status">{t("Đang tải dữ liệu quản trị…")}</p></Card>;
  const amount = (value: number) => `${value.toLocaleString(language === "en" ? "en-US" : "vi-VN")} Xu`;
  return <div className="stack customer-admin-orders">
    <nav aria-label={t("Đường dẫn trang")} className="small mute"><Link href={returnTo}>{t("Khách hàng")}</Link> / {customer.data.name} / {t("Hồ sơ & đơn hàng khách")}</nav>
    <Card>
      <div className="row between wrap">{back}{legacy && <div className="row wrap">
        <button className="btn sm ghost" onClick={() => setForm("name")}>{t("Sửa tên")}</button>
        <button className="btn sm" onClick={() => setForm("order")}>{t("Thêm đơn")}</button>
        <button className="btn sm" onClick={() => setForm("batch")}>{t("Nhập nhiều đơn")}</button>
      </div>}</div>
      <div className="customer-summary">
        <h2>{customer.data.name}</h2>{customer.data.email.trim() && <p className="small mute">{customer.data.email}</p>}
        <details><summary>{t("Số dư và xếp hạng chi tiết")}</summary><p className="row wrap">{t("Hạng tuần")}: <CustomerRank rank={customer.data.weekRank} /> · {t("Hạng tháng")}: <CustomerRank rank={customer.data.monthRank} /></p>
        <dl className="customer-order-detail">
          {[[t("Xu xanh"), customer.data.greenAvailable || 0], [t("Giữ Xu xanh đổi quà"), customer.data.greenGiftHeld || 0], [t("Tổng Xu vàng"), customer.data.goldTotal || 0], [t("Đã sử dụng"), customer.data.goldUsed || 0], [t("Xu vàng khả dụng"), customer.data.available], [t("Tạm giữ"), customer.data.held], [t("Giữ Xu đổi quà"), customer.data.giftHeld]].map(([label, value]) => <div key={label}><dt className="small mute">{label}</dt><dd className="num">{amount(Number(value))}</dd></div>)}
        </dl></details>
        <div className="row wrap"><strong className="num">{t("Xu vàng khả dụng")}: {amount(customer.data.available)}</strong><span className="num">{t("Xu xanh")}: {amount(customer.data.greenAvailable || 0)}</span></div>
      </div>
    </Card>
    {legacy && <LegacyOrderExample />}
    <div className="tabs" role="group" aria-label={t("Trạng thái đơn hàng")}>
      {["", "pending", "approved", "rejected"].map(value => <button key={value} aria-pressed={value === status} onClick={() => { setStatus(value); setPage(1); setSelected(""); }}>{value ? <Status value={value} label={value === "pending" ? t("Chờ duyệt") : undefined} /> : t("Tất cả")}</button>)}
    </div>
    <Card>
      {orders.isPending ? <p role="status">{t("Đang tải…")}</p> : orders.error ? <QueryError error={orders.error} retry={() => void orders.refetch()} /> : !orders.data?.length ? <Empty text={t("Chưa có đơn hàng")} /> : <Table responsive scrollLabel={t("Đơn hàng của khách")} rows={orders.data} columns={[
        { label: t("Mã đơn"), render: row => <>{row.externalId}{row.isManual && <p><span className="pill">{t("Nhập tay")}</span></p>}</> },
        { label: t("Sản phẩm"), render: row => row.productName },
        { label: t("Đặt lúc"), render: row => orderTime(row.orderedAt, language) },
        { label: t("Số Xu hoàn"), render: row => amount(row.cashback) },
        { label: t("Trạng thái"), render: row => <Status value={row.status} /> },
        { label: t("Thao tác"), render: row => <button className="btn sm ghost" onClick={() => setSelected(row.id)}>{t("Chi tiết")}</button> },
      ]} />}
      <CustomerPages page={page} hasNext={!!orders.meta?.hasNext} busy={orders.isFetching} onPage={setPage} />
    </Card>
    {selected && <AdminOrderDetail key={selected} endpoint={`${base}/orders/${encodeURIComponent(selected)}`} scope={ctx.me?.id} onClose={() => setSelected("")} />}
    {form === "batch" ? <LegacyOrderBatch endpoint={`${base}/orders/batch`} ctx={ctx} onClose={() => setForm(null)} /> : form && <LegacyCustomerForm mode={form} name={customer.data.name} endpoint={form === "name" ? `${base}/name` : `${base}/orders`} ctx={ctx} onClose={() => setForm(null)} />}
  </div>;
}
