"use client";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { legacyOrderExample, parseLegacyOrders, type LegacyOrderInput } from "@/lib/legacy-orders";
import { useI18n } from "@/lib/i18n";
import type { AppContext } from "../app-context";
import { Card, Table } from "../ui";
import { AdminPanel } from "./admin-ui";

export function LegacyOrderExample() {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  return <details className="legacy-order-example"><summary>{t("Mẫu nhập nhiều đơn JSON")}</summary><Card title={t("Mẫu nhập nhiều đơn JSON")}>
    <p className="small mute">{t("Sao chép mẫu, sửa sản phẩm, ngày giờ và Xu rồi chọn Nhập nhiều đơn JSON.")}</p>
    <pre className="legacy-json-example" tabIndex={0} aria-label={t("Mẫu JSON")}><code>{legacyOrderExample}</code></pre>
    <div className="row wrap">
      <button className="btn sm ghost" onClick={async () => { try { await navigator.clipboard.writeText(legacyOrderExample); setMessage(t("Đã sao chép mẫu JSON.")); } catch { setMessage(t("Không thể sao chép. Hãy chọn và sao chép mẫu bên trên.")); } }}>{t("Sao chép JSON")}</button>
      <button className="btn sm ghost" onClick={() => {
        const url = URL.createObjectURL(new Blob([legacyOrderExample], { type: "application/json" }));
        const link = document.createElement("a"); link.href = url; link.download = "mau-don-hang.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}>{t("Tải mẫu .json")}</button>
      <a className="btn sm ghost" href="/guides/legacy-orders.html" target="_blank" rel="noopener noreferrer">{t("Hướng dẫn nhập JSON")}</a>
    </div>
    <p className="small mute">{t("orderedAt cần múi giờ, ví dụ +07:00. cashback là số nguyên dương; note không bắt buộc. Top tính theo lúc lưu đơn.")}</p>
    <p className="small" role="status">{message}</p>
  </Card></details>;
}
export function LegacyOrderBatch({ endpoint, ctx, onClose }: { endpoint: string; ctx: AppContext; onClose: () => void }) {
  const { t, language } = useI18n();
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [retryOrders, setRetryOrders] = useState<LegacyOrderInput[] | null>(null);
  const preview = checked ? parseLegacyOrders(text) : null;
  const amount = (v: number) => `${v.toLocaleString(language === "en" ? "en-US" : "vi-VN")} Xu`;
  async function save() {
    const value = parseLegacyOrders(text); setChecked(true);
    if (value.issues.length && !retryOrders) return;
    setBusy(true); setError("");
    try { await ctx.act(endpoint, "POST", { orders: retryOrders || value.orders }); onClose(); }
    catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && (e.status >= 500 || e.code === "API_UNAVAILABLE")) setRetryOrders(retryOrders || value.orders);
    } finally { setBusy(false); }
  }
  return <AdminPanel title={t("Nhập nhiều đơn JSON")} dirty={!!text&&!busy} onClose={() => { if (!busy) onClose(); }}>
    <p className="small mute">{t("Lưu toàn bộ hoặc không lưu đơn nào. Đơn được duyệt và cộng Xu vàng ngay.")}</p>
    <label className="field" htmlFor="legacy-order-json">{t("Mảng JSON (1–100 đơn)")}</label>
    <textarea className="inp legacy-json-editor" id="legacy-order-json" value={text} rows={12} spellCheck={false} disabled={busy || !!retryOrders} onChange={e => { setText(e.target.value); setChecked(false); setError(""); }} />
    {error && <p className="err" role="alert">{t(error)}</p>}
    {retryOrders && <p role="status">{t("Kết quả chưa xác định. Gửi lại cùng dữ liệu để tránh tạo trùng.")}</p>}
    <button className="btn sm ghost" disabled={busy || !!retryOrders} onClick={() => setChecked(true)}>{t("Kiểm tra và xem trước")}</button>
    {preview && (preview.issues.length ? <ul className="err" role="alert">{preview.issues.map((issue, i) => <li key={i}>{issue.index && <>{t("Đơn")} {issue.index} · {issue.field}: </>}{t(issue.message)}</li>)}</ul> : <div className="stack legacy-batch-preview">
      <p role="status"><b>{preview.orders.length} {t("đơn")}</b> · {t("Tổng Xu vàng sẽ cộng")}: <strong>{amount(preview.total)}</strong></p>
      <Table responsive scrollLabel={t("Xem trước đơn JSON")} rows={preview.orders.map((order, i) => ({ ...order, id: String(i + 1) }))} columns={[
        { label: "#", render: row => row.id }, { label: t("Sản phẩm"), render: row => row.productName },
        { label: t("Đặt lúc"), render: row => row.orderedAt }, { label: t("Số Xu hoàn"), render: row => amount(row.cashback) }, { label: t("Ghi chú"), render: row => row.note || "—" },
      ]} />
    </div>)}
    <button className="btn" disabled={busy || (!retryOrders && (!preview || !!preview.issues.length))} onClick={() => void save()}>{busy ? t("Đang lưu…") : retryOrders ? t("Gửi lại cùng dữ liệu") : t("Lưu tất cả đơn")}</button>
  </AdminPanel>;
}
