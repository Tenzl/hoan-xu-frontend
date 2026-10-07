"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Coins, PackageMinus, Pencil, Plus, Send, X } from "lucide-react";
import { api, ApiError, date } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import type { AppContext } from "../app-context";
import { Form, Status, type Data, type Field } from "../ui";
import { GiftImage, validGiftImageUrl } from "../gift-details";
import { AdminUnsavedChanges } from "./admin-ui";
import { GiftIcon } from "../gift-icon";

type CatalogGift = components["schemas"]["Gift"] & { pendingCount?: number; pendingXu?: number };
type Panel = { kind: "new" | "edit" | "stock" | "price" | "complete" | "reject"; row: Data };
type Job = { path: string; method: string; body?: Data; success: (result: Data) => void };

export function AdminGifts({ ctx }: { ctx: AppContext }) {
  const { t, language } = useI18n();
  const [view, setView] = useState("requests");
  const [status, setStatus] = useState("pending");
  const [giftId, setGiftId] = useState("");
  const [page, setPage] = useState(1);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState<Job | null>(null);
  const sending = useRef(false);
  const panelRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const gifts = useQuery({ queryKey: ["/admin/gifts"], queryFn: () => api<CatalogGift[]>("/admin/gifts"), refetchInterval: 15000 });
  const requests = usePagedQuery<Data>(`/admin/gift-redemptions?status=${status}&giftId=${encodeURIComponent(giftId)}&page=${page}`, true, 15000, ctx.me?.id);
  const rows = Array.isArray(requests.data) ? requests.data : [];
  const catalog = gifts.data || [];
  const number = (n: number) => new Intl.NumberFormat(language === "vi" ? "vi-VN" : "en-US").format(n);
  const locked = busy || retry !== null;
  const pendingCount = catalog.reduce((sum, g) => sum + (g.pendingCount || 0), 0);
  const pendingXu = catalog.reduce((sum, g) => sum + (g.pendingXu || 0), 0);

  function open(kind: Panel["kind"], row: Data = {}) {
    returnFocus.current = document.activeElement as HTMLElement;
    setDirty(false); setDiscard(false); setError(""); setPanel({ kind, row }); setImageUrl(row.imageUrl || ""); setDescription(row.description || "");
  }
  function close() {
    setDirty(false); setDiscard(false); setPanel(null);
    requestAnimationFrame(() => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
      else document.getElementById(`gift-tab-${view}`)?.focus();
    });
  }
  function requestClose() { if (!locked) { if (dirty) setDiscard(true); else close(); } }
  const editing = panel !== null;
  useEffect(() => {
    if (!editing) return;
    const dialog = panelRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => { dialog?.close(); document.body.style.overflow = overflow; };
  }, [editing]);
  async function run(job: Job) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const result = await ctx.act(job.path, job.method, job.body);
      setRetry(null); job.success(result || {});
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && e.status >= 500) setRetry(job);
      else {
        setRetry(null);
        const [fresh] = await Promise.allSettled([gifts.refetch(), requests.refetch()]);
        if (e instanceof ApiError && e.code === "GIFT_STOCK_CHANGED" && fresh.status === "fulfilled") {
          setEditorVersion(v => v + 1);
          setPanel(previous => {
            const current = fresh.value.data?.find(g => g.id === previous?.row.id);
            return previous && current ? { ...previous, row: { ...previous.row, stock: current.stock } } : previous;
          });
        }
      }
    } finally { sending.current = false; setBusy(false); }
  }
  const saved = () => { setMessage(t("Đã lưu thông tin quà.")); close(); };
  function outOfStock(gift: CatalogGift) {
    void run({ path: `/admin/gifts/${gift.id}/out-of-stock`, method: "POST", success: result => {
      setMessage(t("Đã hoàn {count} yêu cầu, tổng {amount} Xu. Quà đã được đánh dấu hết hàng.").replace("{count}", number(result.refundedCount)).replace("{amount}", number(result.refundedXu)) + ` ${t("Xu vàng")}: ${number(result.refundedGoldXu || 0)} · ${t("Xu xanh")}: ${number(result.refundedGreenXu || 0)}`);
    } });
  }
  function refund(row: Data) {
    void run({ path: `/admin/gift-redemptions/${row.id}/events`, method: "POST", body: { action: "refund_out_of_stock", code: "", reason: "" }, success: () => setMessage(t("Đã hoàn Xu và thông báo cho khách.")) });
  }
  const title = panel ? ({ new: t("Thêm quà"), edit: t("Cập nhật quà"), stock: t("Cập nhật tồn kho"), price: t("Cập nhật giá"), complete: t("Cấp mã voucher"), reject: t("Từ chối đổi quà") })[panel.kind] : "";
  let fields: Field[] = [];
  if (panel) {
    if (panel.kind === "complete") fields = [{ name: "code", label: t("Mã voucher"), max: 500 }];
    else if (panel.kind === "reject") fields = [{ name: "reason", label: t("Lý do"), type: "textarea", max: 500 }];
    else {
      if (panel.kind === "new" || panel.kind === "edit") fields.push(
        { name: "name", label: t("Tên quà"), max: 80 },
        { name: "imageUrl", label: t("Đường dẫn ảnh quà"), type: "url", required: false, max: 2048, default: "", placeholder: "https://...", onChange: value => setImageUrl(value.trim()) },
        { name: "description", label: t("Mô tả"), type: "textarea", required: false, max: 2000, default: "", onChange: value => setDescription(value) }
      );
      if (panel.kind !== "stock") fields.push({ name: "costXu", label: t("Giá Xu"), type: "number", min: 1, max: 1e12, step: 1 });
      if (panel.kind !== "price") fields.push({ name: "stock", label: t("Số lượng còn lại"), type: "number", min: 0, max: 100000, step: 1, default: 0 });
      if (panel.kind === "new" || panel.kind === "edit") fields.push({ name: "active", label: t("Đang mở đổi"), type: "checkbox", default: true });
    }
  }
  async function save(values: Data) {
    if (!panel) return;
    const row = panel.row;
    if (Object.values(values).some(v => typeof v === "number" && !Number.isSafeInteger(v))) { setError(t("Giá và số lượng phải là số nguyên.")); return; }
    if (panel.kind === "complete" || panel.kind === "reject") {
      if ((panel.kind === "complete" ? values.code : values.reason).trim().length < 3) { setError(t("Nội dung cần ít nhất 3 ký tự.")); return; }
      await run({ path: `/admin/gift-redemptions/${row.id}/events`, method: "POST", body: { action: panel.kind === "complete" ? "completed" : "rejected", code: "", reason: "", ...values }, success: () => { setMessage(t("Đã xử lý yêu cầu và thông báo cho khách.")); close(); } });
      return;
    }
    const body: Data = { ...values };
    if (body.imageUrl !== undefined) {
      body.imageUrl = body.imageUrl.trim();
      if (!validGiftImageUrl(body.imageUrl)) { setError(t("Vui lòng nhập đường dẫn ảnh HTTPS hợp lệ.")); return; }
    }
    if (body.description !== undefined && [...body.description].length > 2000) { setError(t("Mô tả tối đa 2.000 ký tự.")); return; }
    if (panel.kind !== "new") {
      for (const key of Object.keys(body)) if (body[key] === row[key]) delete body[key];
      if (body.stock !== undefined) body.expectedStock = row.stock;
      if (!Object.keys(body).length) { close(); return; }
    }
    await run({ path: panel.kind === "new" ? "/admin/gifts" : `/admin/gifts/${row.id}`, method: panel.kind === "new" ? "POST" : "PATCH", body, success: saved });
  }

  return <section className="admin-gift-page" aria-label={t("Quà tặng")}>
    <AdminUnsavedChanges dirty={editing && dirty && !locked}/><header className="admin-gift-heading"><div><p className="admin-gift-eyebrow">{t("Quản lý đổi quà")}</p><h1 id="admin-gift-title">{t("Quà và yêu cầu đổi")}</h1><p>{t("Theo dõi kho, cấp voucher và xử lý hoàn Xu tại một nơi.")}</p></div><button className="btn" disabled={locked} onClick={() => open("new")}><Plus size={18}/>{t("Thêm quà")}</button></header>
    <div className="admin-gift-summary"><div><span>{t("Yêu cầu đang chờ")}</span><strong className="num">{gifts.data ? number(pendingCount) : "—"}</strong></div><div><span>{t("Xu đang giữ")}</span><strong className="num">{gifts.data ? number(pendingXu) : "—"}<small> Xu</small></strong></div><div><span>{t("Quà còn hàng")}</span><strong className="num">{gifts.data ? number(catalog.filter(g => g.stock > 0 && g.active).length) : "—"}</strong></div></div>
    {message && <div className="admin-gift-feedback" role="status"><Check size={18}/><p>{message}</p></div>}
    {error && !panel && <div className="admin-gift-error" role="alert"><p>{error}</p>{retry && <><p>{t("Chưa xác nhận được kết quả. Kiểm tra lại trước khi thực hiện thao tác khác.")}</p><button className="btn sm ghost" disabled={busy} onClick={() => void run(retry)}>{t("Thử lại thao tác")}</button></>}</div>}
    <div className="admin-gift-tabs" role="tablist" aria-label={t("Quản lý đổi quà")} onKeyDown={e => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
      e.preventDefault();
      const next = e.key === "Home" ? "requests" : e.key === "End" ? "catalog" : view === "requests" ? "catalog" : "requests";
      setView(next); document.getElementById(`gift-tab-${next}`)?.focus();
    }}>{[{ id: "requests", label: t("Yêu cầu đổi quà") }, { id: "catalog", label: t("Danh mục & tồn kho") }].map(tab => <button key={tab.id} id={`gift-tab-${tab.id}`} role="tab" tabIndex={view === tab.id ? 0 : -1} aria-selected={view === tab.id} aria-controls={`gift-panel-${tab.id}`} onClick={() => setView(tab.id)}>{tab.label}</button>)}</div>
    <div className="admin-gift-workspace">
      <section id={`gift-panel-${view}`} role="tabpanel" aria-labelledby={`gift-tab-${view}`} className="admin-gift-content">
        {view === "catalog" ? <>
          <div className="admin-gift-section-heading"><h2>{t("Danh mục và tồn kho")}</h2><p>{t("Bấm hết hàng để hoàn mọi yêu cầu đang chờ của quà đó.")}</p></div>
          {gifts.isPending ? <div className="admin-gift-skeleton" role="status" aria-label={t("Đang tải quà…")}/> : gifts.isError ? <div className="admin-gift-error" role="alert"><p>{t(gifts.error.message)}</p><button className="btn sm ghost" onClick={() => void gifts.refetch()}>{t("Thử lại")}</button></div> : !catalog.length ? <div className="admin-gift-empty"><GiftIcon width={36} height={36}/><h3>{t("Chưa có quà trong danh mục.")}</h3><p>{t("Thêm quà đầu tiên để khách có thể đổi bằng Xu.")}</p></div> : <ul className="admin-gift-list">{catalog.map(gift => <li key={gift.id} className="admin-gift-item" data-gift-id={gift.id}>
            <div className="admin-gift-item-heading"><GiftImage src={gift.imageUrl} name={gift.name}/><div><h3>{gift.name}</h3></div><span className={`admin-gift-stock-label ${gift.stock > 0 ? "in-stock" : "out-stock"}`}>{t(gift.stock > 0 ? "Còn hàng" : "Hết hàng")}</span></div>
            {gift.description && <p className="admin-gift-description">{gift.description}</p>}
            <dl className="admin-gift-item-stats"><div><dt>{t("Giá Xu")}</dt><dd className="num">{number(gift.costXu)}</dd></div><div><dt>{t("Tồn kho")}</dt><dd className="num">{number(gift.stock)}</dd></div><div><dt>{t("Yêu cầu đang chờ")}</dt><dd className="num">{number(gift.pendingCount || 0)}</dd></div></dl>
            {!gift.active && <p className="small mute">{t("Đang tạm ẩn khỏi cửa hàng")}</p>}
            <div className="admin-gift-item-actions"><button className="btn sm ghost" disabled={locked} onClick={() => open("stock", gift)}><Plus size={15}/>{t("Cập nhật tồn kho")}</button><button className="btn sm ghost" disabled={locked} onClick={() => open("price", gift)}><Coins size={15}/>{t("Cập nhật giá")}</button><button className="btn sm ghost" disabled={locked} onClick={() => open("edit", gift)}><Pencil size={15}/>{t("Sửa")}</button></div>
            <div className="admin-gift-out-action"><button className="btn sm ghost danger" disabled={locked || (gift.stock === 0 && !gift.pendingCount)} onClick={() => outOfStock(gift)}><PackageMinus size={16}/>{t(busy ? "Đang xử lý…" : "Hết hàng và hoàn Xu")}</button><span className="small mute">{number(gift.pendingGoldXu || 0)} {t("Xu vàng")} · {number(gift.pendingGreenXu || 0)} {t("Xu xanh")} {t("sẽ được hoàn")}</span></div>
          </li>)}</ul>}
        </> : <>
          <div className="admin-gift-filters"><label>{t("Trạng thái")}<select className="inp" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>{[{ value: "pending", label: t("Chờ xử lý") }, { value: "completed", label: t("Hoàn thành") }, { value: "rejected", label: t("Đã hoàn / từ chối") }, { value: "", label: t("Tất cả") }].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label><label>{t("Quà")}<select className="inp" value={giftId} onChange={e => { setGiftId(e.target.value); setPage(1); }}><option value="">{t("Tất cả quà")}</option>{catalog.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label></div>
          {requests.isPending ? <div className="admin-gift-skeleton" role="status" aria-label={t("Đang tải yêu cầu…")}/> : requests.error ? <div className="admin-gift-error" role="alert"><p>{t(requests.error.message)}</p><button className="btn sm ghost" onClick={() => void requests.refetch()}>{t("Thử lại")}</button></div> : !rows.length ? <div className="admin-gift-empty"><Check size={32}/><h3>{t("Không có yêu cầu phù hợp.")}</h3><p>{t("Yêu cầu mới sẽ xuất hiện tại đây.")}</p></div> : <ul className="admin-gift-request-list">{rows.map(row => <li key={row.id} className="admin-gift-request">
            <div className="admin-gift-request-heading"><div><h3>{row.giftName}</h3><p>{row.name} · <time>{date(row.createdAt)}</time></p></div><Status value={row.status}/></div><p className="admin-gift-request-price num">{number(row.costXu)} Xu {t(row.currency === "green" ? "xanh" : "vàng")}</p>
            {row.status === "pending" ? <div className="admin-gift-request-actions"><button className="btn sm" disabled={locked} onClick={() => open("complete", row)}><Send size={15}/>{t("Cấp mã")}</button><button className="btn sm ghost danger" disabled={locked} onClick={() => refund(row)}><ArrowLeft size={15}/>{t("Hoàn Xu vì hết hàng")}</button><button className="btn sm ghost" disabled={locked} onClick={() => open("reject", row)}>{t("Từ chối")}</button></div> : row.reason && <p className="small mute">{row.reason}</p>}
          </li>)}</ul>}
          <div className="row between pager"><button className="btn sm ghost" disabled={page === 1 || requests.isFetching} onClick={() => setPage(p => p - 1)}>{t("← Trước")}</button><span className="small mute">{t("Trang")} {page}</span><button className="btn sm ghost" disabled={!requests.meta?.hasNext || requests.isFetching} onClick={() => setPage(p => p + 1)}>{t("Tiếp →")}</button></div>
        </>}
      </section>
      {panel && <dialog className="admin-gift-editor gift-modal" ref={panelRef} aria-labelledby="gift-editor-title" onCancel={e => { e.preventDefault(); requestClose(); }}><header><h2 id="gift-editor-title">{title}</h2><button className="btn sm ghost icon-button" disabled={locked} aria-label={t("Đóng bảng chỉnh sửa")} onClick={requestClose}><X size={18}/></button></header>{discard && <div className="gift-modal-body"><p>{t("Bạn có thay đổi chưa lưu.")}</p><div className="row wrap"><button className="btn ghost" onClick={() => setDiscard(false)}>{t("Tiếp tục chỉnh sửa")}</button><button className="btn danger" onClick={close}>{t("Bỏ thay đổi")}</button></div></div>}<div className="gift-modal-body" hidden={discard}>{panel.row.name && <p className="mute">{panel.row.name}</p>}
        {panel.kind === "complete" && <div className="admin-gift-notice-preview"><span>{t("Thông báo gửi cho khách")}</span><p>{t("Chào {name}, voucher {gift} của bạn đã sẵn sàng. Mở Lịch sử đổi quà để xem mã.").replace("{name}", panel.row.name?.trim() || t("bạn")).replace("{gift}", panel.row.giftName)}</p></div>}
        {(panel.kind === "new" || panel.kind === "edit") && <div className="gift-modal-preview"><GiftImage src={imageUrl} name={panel.row.name || t("Quà")} preview/><p>{t("Dán đường dẫn ảnh trực tiếp. Bạn có thể bổ sung ảnh và mô tả sau.")}</p></div>}
        {error && <div className="admin-gift-error" role="alert"><p>{error}</p>{retry && <><p>{t("Chưa xác nhận được kết quả. Kiểm tra lại trước khi thực hiện thao tác khác.")}</p><button className="btn sm ghost" disabled={busy} onClick={() => void run(retry)}>{t("Thử lại thao tác")}</button></>}</div>}
        <fieldset disabled={locked}><Form onDirtyChange={() => setDirty(true)} id="gift-editor-form" hideSubmit key={`${panel.kind}-${panel.row.id || "new"}-${editorVersion}`} fields={fields} initial={panel.row} busy={locked} submit={panel.kind === "new" ? t("Tạo quà") : panel.kind === "complete" ? t("Cấp voucher và thông báo") : panel.kind === "reject" ? t("Từ chối và hoàn Xu") : t("Lưu thay đổi")} onSubmit={save} afterFields={(panel.kind === "new" || panel.kind === "edit") && <div className="gift-description-count">{[...description].length.toLocaleString(language)} / 2.000 {t("ký tự")}</div>}/></fieldset>
      </div><footer className="gift-modal-footer" hidden={discard}><button className="btn sm ghost" type="button" disabled={locked} onClick={requestClose}>{t("Đóng")}</button><button className="btn" type="submit" form="gift-editor-form" disabled={locked}>{busy ? t("Đang xử lý…") : panel.kind === "new" ? t("Tạo quà") : panel.kind === "complete" ? t("Cấp voucher và thông báo") : panel.kind === "reject" ? t("Từ chối và hoàn Xu") : t("Lưu thay đổi")}</button></footer></dialog>}
    </div>
  </section>;
}
