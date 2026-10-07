"use client";
import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import type { AppContext } from "../app-context";
import { Card, Table } from "../ui";
import { GiftImage } from "../gift-details";
import { weekLabel, type WeeklyCampaign, type WeeklyPreview, type WeeklyAward } from "../weekly-prizes";

import { AdminTabs, AdminUnsavedChanges } from "./admin-ui";

type Gift = components["schemas"]["Gift"];
type Job = { endpoint: string; body: unknown; success: () => void | Promise<void> };
function weekStart() {
  const local = new Date(Date.now() + 7 * 3600000);
  local.setUTCHours(0, 0, 0, 0); local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  return new Date(local.getTime() - 7 * 3600000).toISOString();
}
function CampaignEditor({ campaign, week, gifts, locked, save }: { campaign?: WeeklyCampaign; week: string; gifts: Gift[]; locked: boolean; save: (body: components["schemas"]["WeeklyPrizeCampaignInput"]) => void }) {
  const { t } = useI18n();
  const [giftId, setGiftId] = useState(campaign?.giftId || "");
  const [title, setTitle] = useState(campaign?.title || t("Top 5 tuần, rước quà về!"));
  const [description, setDescription] = useState(campaign?.description || t("Tích lũy Xu vàng, bứt phá Top 5 và nhận quà từ Hoàn Xu."));
  const [enabled, setEnabled] = useState(campaign?.status === "active");
  const [dirty,setDirty]=useState(false);
  const selected = gifts.find(g => g.id === giftId);
  const closed = !!campaign && (campaign.status === "settled" || Date.parse(campaign.weekEnd) <= Date.now());
  return <form className="weekly-config" onChange={()=>setDirty(true)} onSubmit={e => { e.preventDefault(); save({ weekStart: week, giftId, title: title.trim(), description: description.trim(), enabled, version: campaign?.version || 0 }); }}>
    <AdminUnsavedChanges dirty={dirty&&!locked}/>
    <fieldset disabled={locked || closed}>
      <div className="field"><label htmlFor="weekly-gift">{t("Quà cho Top 5")}</label><select id="weekly-gift" className="inp" required value={giftId} onChange={e => setGiftId(e.target.value)}>
        <option value="">{t("Chọn quà trong kho")}</option>{gifts.filter(g => g.active || g.id === campaign?.giftId).map(g => <option key={g.id} value={g.id}>{g.name} · {t("Tồn kho")}: {g.stock}{!g.active ? ` · ${t("Đã tắt")}` : ""}</option>)}
      </select></div>
      {selected && <div className="row wrap weekly-config-gift"><GiftImage src={selected.imageUrl} name={selected.name} /><div><b>{selected.name}</b><p className="small mute">{t("Kho có thể đổi")}: {selected.stock} · {t("Đang giữ cho tuần này")}: {campaign?.giftId === selected.id ? campaign.reservedCount : 0}</p></div></div>}
      <div className="field"><label htmlFor="weekly-title">{t("Tiêu đề banner")}</label><input id="weekly-title" className="inp" required maxLength={120} value={title} onChange={e => setTitle(e.target.value)} /></div>
      <div className="field"><label htmlFor="weekly-description">{t("Lời giới thiệu banner")}</label><textarea id="weekly-description" className="inp" rows={3} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} /></div>
      <label className="row weekly-enable"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />{t("Bật thưởng Top 5 tuần này")}</label>
      <p className="small mute">{t("Bật sẽ giữ năm phần quà. Đổi quà hoặc tắt sẽ hoàn phần giữ cũ trong cùng một lần lưu. Không tự mở tuần tiếp theo.")}</p>
      <button type="submit" className="btn">{t("Lưu chương trình")}</button>
    </fieldset>
    {closed && <p className="mute">{t("Tuần đã kết thúc. Nội dung và người thắng được giữ nguyên.")}</p>}
  </form>;
}
export function AdminWeeklyPrizes({ ctx }: { ctx: AppContext }) {
  const { t, language } = useI18n();
  const [tab, setTab] = useState("config");
  const [currentWeek] = useState(weekStart);
  const nextWeek = new Date(Date.parse(currentWeek) + 7 * 86400000).toISOString();
  const [week, setWeek] = useState(currentWeek);
  const [campaignId, setCampaignId] = useState("");
  const [preview, setPreview] = useState<WeeklyPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [retry, setRetry] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState("");
  const [note, setNote] = useState("");
  const allowed = ctx.me?.role === "admin" || !!ctx.me?.permissions?.includes("gifts");
  const campaigns = useQuery<WeeklyCampaign[]>({ queryKey: ["/admin/leaderboard-prizes", ctx.me?.id], queryFn: ({ signal }) => api("/admin/leaderboard-prizes", "GET", undefined, undefined, signal), enabled: allowed });
  const gifts = useQuery<Gift[]>({ queryKey: ["/admin/gifts"], queryFn: ({ signal }) => api("/admin/gifts", "GET", undefined, undefined, signal), enabled: allowed });
  const awards = useQuery<WeeklyAward[]>({ queryKey: [`/admin/leaderboard-prizes/${campaignId}/awards`, ctx.me?.id], queryFn: ({ signal }) => api(`/admin/leaderboard-prizes/${campaignId}/awards`, "GET", undefined, undefined, signal), enabled: allowed && !!campaignId });
  const locked = busy || !!retry;
  const selected = campaigns.data?.find(c => Date.parse(c.weekStart) === Date.parse(week));
  const selectedEnd = new Date(Date.parse(week) + 7 * 86400000).toISOString();
  const amount = (n: number) => `${n.toLocaleString(language === "en" ? "en-US" : "vi-VN")} Xu`;
  async function run(job: Job) {
    if (sending.current) return;
    sending.current = true; setBusy(true); setError(""); setMessage("");
    try { await ctx.act(job.endpoint, "POST", job.body); setRetry(null); await job.success(); }
    catch (e) { setError((e as Error).message); if (e instanceof ApiError && (e.status >= 500 || e.code === "API_UNAVAILABLE")) setRetry(job); }
    finally { sending.current = false; setBusy(false); }
  }
  async function loadPreview(id: string) {
    setTab("settlement"); setBusy(true); setError(""); setPreview(null); setCampaignId(id); setDelivery(""); setNote("");
    try { setPreview(await api<WeeklyPreview>(`/admin/leaderboard-prizes/${id}/preview`)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  if (!allowed) return <Card><p role="alert">{t("Bạn không có quyền.")}</p></Card>;
  return <div className="stack weekly-admin">
      {(error || campaigns.error || gifts.error) && <div role="alert"><p className="err">{t(error || campaigns.error?.message || gifts.error?.message || "")}</p>{!retry && <button className="btn sm ghost" disabled={busy} onClick={() => { void campaigns.refetch(); void gifts.refetch(); }}>{t("Tải lại cấu hình")}</button>}</div>}
      {retry && <div role="status"><p>{t("Kết quả chưa xác định. Gửi lại cùng dữ liệu để tránh tạo trùng.")}</p><button className="btn" disabled={busy} onClick={() => void run(retry)}>{t("Gửi lại cùng dữ liệu")}</button></div>}
      {message && <p role="status">{message}</p>}

    <AdminTabs label={t("Thưởng xếp hạng tuần")} value={tab} onChange={setTab} options={[{value:"config",label:t("Cấu hình chương trình")},{value:"settlement",label:t("Chốt người thắng")},{value:"delivery",label:t("Trao quà")}]} />
    <AdminUnsavedChanges dirty={!!note&&!busy}/>
    <div hidden={tab !== "config"}><Card title={t("Cấu hình chương trình")}>
      <p className="mute">{t("Người dùng cũ và mới cùng cuộc đua. Năm người dẫn đầu nhận cùng một quà, mỗi người một phần, không trừ Xu.")}</p>
      <div className="field"><label htmlFor="weekly-period">{t("Tuần áp dụng")}</label><select id="weekly-period" className="inp" disabled={locked} value={week} onChange={e => { setWeek(e.target.value); setError(""); }}>
        <option value={currentWeek}>{t("Tuần hiện tại")}</option><option value={nextWeek}>{t("Tuần kế tiếp")}</option>
      </select><p className="small mute">{weekLabel(week, selectedEnd, language)} · GMT+7</p></div>
      {campaigns.isPending || gifts.isPending ? <p role="status">{t("Đang tải…")}</p> : !campaigns.error && !gifts.error && <CampaignEditor key={`${week}-${selected?.version || 0}`} campaign={selected} week={week} gifts={gifts.data || []} locked={locked} save={body => void run({ endpoint: "/admin/leaderboard-prizes", body, success: () => { setMessage(t("Đã lưu chương trình tuần.")); setPreview(null); } })} />}
    </Card></div>
    <div hidden={tab !== "settlement"}><Card title={t("Lịch sử và chốt tuần")}>
      {!campaigns.data?.length ? <p className="mute">{t("Chưa có chương trình thưởng tuần.")}</p> : <Table responsive scrollLabel={t("Chương trình thưởng tuần")} rows={campaigns.data} columns={[
        { label: t("Tuần"), render: c => weekLabel(c.weekStart, c.weekEnd, language) },
        { label: t("Quà"), render: c => c.gift.name },
        { label: t("Trạng thái"), render: c => c.status === "settled" ? t("Đã chốt") : c.status === "active" ? t("Đang bật") : t("Đã tắt") },
        { label: t("Đang giữ"), render: c => c.reservedCount },
        { label: t("Thao tác"), render: c => <button className="btn sm ghost" disabled={locked} onClick={() => {void loadPreview(c.id); if(c.status === "settled")setTab("delivery");}}>{c.status === "settled" ? t("Xem và trao quà") : t("Xem trước top 5")}</button> },
      ]} />}
    </Card>
    {preview && <Card title={t("Top 5 của tuần được chọn")}>
      <p>{weekLabel(preview.campaign.weekStart, preview.campaign.weekEnd, language)} · {preview.campaign.gift.name}</p>
      {!preview.winners.length ? <p className="mute">{t("Chưa có người đủ điều kiện. Khi chốt, toàn bộ quà giữ sẽ về kho.")}</p> : <Table responsive scrollLabel={t("Người thắng dự kiến")} rows={preview.winners} columns={[
        { label: t("Hạng"), render: w => `#${w.rank}` }, { label: t("Khách"), render: w => w.name }, { label: t("Hoàn Xu"), render: w => amount(w.xu) }, { label: t("Đơn"), render: w => w.orders },
      ]} />}
      {preview.campaign.status !== "settled" && <div className="stack"><p className="small mute">{t("Chốt sẽ cố định người thắng và trả quà dư về kho. Chỉ thực hiện sau khi tuần kết thúc.")}</p><div className="row wrap">
        <button className="btn sm ghost" disabled={locked} onClick={() => void loadPreview(preview.campaign.id)}>{t("Tải lại top 5")}</button>
        <button className="btn" disabled={locked || !preview.canSettle} onClick={() => void run({ endpoint: `/admin/leaderboard-prizes/${preview.campaign.id}/settle`, body: { hash: preview.hash }, success: async () => { setMessage(t("Đã chốt người thắng tuần.")); await loadPreview(preview.campaign.id); setTab("delivery"); } })}>{t("Xác nhận chốt tuần")}</button>
      </div></div>}
    </Card>}
    </div><div hidden={tab !== "delivery"}>
    {!campaignId && <Card><p>{t("Chọn chương trình trong Chốt người thắng để xem phần thưởng.")}</p><button className="btn ghost" onClick={()=>setTab("settlement")}>{t("Chọn chương trình")}</button></Card>}
    {campaignId && <Card title={t("Trao quà cho người thắng")}>
      {awards.isPending ? <p role="status">{t("Đang tải…")}</p> : awards.error ? <div role="alert"><p className="err">{t(awards.error.message)}</p><button className="btn sm ghost" onClick={() => void awards.refetch()}>{t("Thử lại")}</button></div> : !awards.data?.length ? <p className="mute">{t("Phần thưởng xuất hiện sau khi chốt tuần.")}</p> : <Table responsive scrollLabel={t("Phần thưởng tuần")} rows={awards.data} columns={[
        { label: t("Hạng"), render: a => `#${a.rank}` }, { label: t("Khách"), render: a => a.userName }, { label: t("Quà"), render: a => a.gift.name },
        { label: t("Trạng thái"), render: a => a.status === "pending" ? t("Chờ trao") : t("Đã trao") },
        { label: t("Thông tin giao quà"), render: a => a.deliveryNote ? <p className="weekly-delivery-note">{a.deliveryNote}</p> : "—" },
        { label: t("Thao tác"), render: a => a.status === "pending" && <button className="btn sm" disabled={locked} onClick={() => { setDelivery(a.id); setNote(""); }}>{t("Trao quà")}</button> },
      ]} />}
      {delivery && <form className="weekly-delivery-form" onSubmit={e => { e.preventDefault(); void run({ endpoint: `/admin/leaderboard-awards/${delivery}/deliver`, body: { deliveryNote: note.trim() }, success: () => { setDelivery(""); setNote(""); setMessage(t("Đã ghi nhận trao quà.")); } }); }}><fieldset disabled={locked}>
        <label className="field" htmlFor="weekly-delivery">{t("Mã voucher hoặc ghi chú giao quà")} · {awards.data?.find(a => a.id === delivery)?.userName}</label>
        <textarea id="weekly-delivery" className="inp" rows={3} required maxLength={2000} value={note} onChange={e => setNote(e.target.value)} />
        <p className="small mute">{t("Chỉ người nhận và quản trị có quyền xem. Sau khi trao không thể sửa thông tin này.")}</p>
        <div className="row wrap"><button className="btn" type="submit">{t("Xác nhận đã trao")}</button><button className="btn ghost" type="button" onClick={() => setDelivery("")}>{t("Hủy")}</button></div>
      </fieldset></form>}
    </Card>}</div>
  </div>;
}
