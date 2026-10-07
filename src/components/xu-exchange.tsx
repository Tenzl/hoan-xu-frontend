"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { AdminUnsavedChanges } from "./admin-views/admin-ui";
import { useI18n } from "@/lib/i18n";
import { configuredTierName } from "@/lib/cashback";
import type { AppContext } from "./app-context";
import { Card, Modal } from "./ui";
import { XuAmount } from "./xu-amount";
import { xu } from "./leaderboard";

type Policy = components["schemas"]["XuExchangePolicy"];
type QuotePolicy = components["schemas"]["XuExchangeQuotePolicy"];
type Quote = { goldAmountXu: number; expectedPolicyId: string; expectedTierCode: QuotePolicy["tierCode"]; expectedCashbackPolicyId: string; green: number; policy: QuotePolicy };

export function XuBalances({ wallet, greenAction }: { wallet?: components["schemas"]["Wallet"]; greenAction?: ReactNode }) {
  const { t } = useI18n();
  return <div className="xu-balances">
    <div className="card xu-gold"><h3>{t("Có thể rút")}</h3><b className={`num${(wallet?.available || 0) >= 1e9 ? " is-large" : ""}`}><XuAmount amount={wallet?.available}/></b><dl className="wallet-breakdown">
      <div><dt>{t("Tổng Xu vàng")}</dt><dd><XuAmount amount={wallet?.goldTotal}/></dd></div>
      <div><dt>{t("Đã sử dụng")}</dt><dd><XuAmount amount={wallet?.goldUsed}/></dd></div>
      <div><dt>{t("Đang chờ rút tiền")}</dt><dd><XuAmount amount={wallet?.held}/></dd></div>
      <div><dt>{t("Khoản thiếu Xu vàng")}</dt><dd><XuAmount amount={wallet?.debt}/></dd></div>
    </dl></div>
    <div className="card xu-green"><h3>{t("Dùng đổi quà")}</h3><b className={`num${(wallet?.greenAvailable || 0) >= 1e9 ? " is-large" : ""}`}><XuAmount amount={wallet?.greenAvailable} currency="green"/></b><p className="small">{t("Giữ Xu xanh đổi quà")}: <XuAmount amount={wallet?.greenGiftHeld} currency="green"/></p><p className="small">{t("Xu xanh không thể rút hoặc đổi lại Xu vàng.")}</p>{greenAction && <div className="wallet-green-actions">{greenAction}</div>}</div>
  </div>;
}

export function XuExchange({ ctx, available, disabled = false }: { ctx: AppContext; available: number; disabled?: boolean }) {
  const { t, language } = useI18n();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("exchange") === "1") setOpen(true); }, []);
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const policy = useQuery({ queryKey: ["/wallet/exchange-policy", ctx.me?.id], queryFn: () => api<QuotePolicy>("/wallet/exchange-policy"), enabled: open, staleTime: 0 });
  const rate = policy.data;
  const policyReady = !!rate && [rate.goldUnits, rate.greenUnits].every(n => Number.isSafeInteger(n) && n >= 1 && n <= 1e6) && Number.isInteger(rate.bonusPercent) && rate.bonusPercent >= 0 && rate.bonusPercent <= 100 && ["member","silver","gold","diamond"].includes(rate.tierCode) && !!rate.cashbackPolicyId;
  const displayedPolicy = quote?.policy || (!policy.isError && policyReady ? rate : undefined);
  const valid = /^\d{1,13}$/.test(amount) && Number(amount) >= 1 && Number(amount) <= 1e12;
  const received = valid && policyReady && rate ? Number(BigInt(amount) * BigInt(rate.greenUnits) * BigInt(100 + rate.bonusPercent) / (BigInt(rate.goldUnits) * 100n)) : 0;
  const canExchange = !disabled && !policy.isPending && !policy.isError && policyReady && valid && received >= 1 && received <= 1e12 && Number.isSafeInteger(available) && Number(amount) <= available;
  const invalidAmount = !!amount && !canExchange && !policy.isPending && !policy.isError;
  const selectableBalance = Number.isSafeInteger(available) && available > 0 && !disabled;
  function close() { if (busy || uncertain) return; setOpen(false); setQuote(null); setError(""); }
  async function send() {
    if (!quote || sending.current) return;
    sending.current = true; setBusy(true); setError("");
    try {
      await ctx.act("/wallet/exchanges", "POST", { goldAmountXu: quote.goldAmountXu, expectedPolicyId: quote.expectedPolicyId, expectedTierCode: quote.expectedTierCode, expectedCashbackPolicyId: quote.expectedCashbackPolicyId });
      setUncertain(false); setQuote(null); setAmount(""); setOpen(false); ctx.notify(t("Đã đổi Xu vàng sang Xu xanh."));
    } catch (e) {
      setError((e as Error).message);
      if (e instanceof ApiError && (e.status >= 500 || e.code === "API_UNAVAILABLE")) setUncertain(true);
      else { setUncertain(false); setQuote(null); await policy.refetch(); }
    } finally { sending.current = false; setBusy(false); }
  }
  return <><button className="btn ghost" disabled={disabled} onClick={() => { void policy.refetch(); setOpen(true); }}>{t("Đổi Xu vàng sang Xu xanh")}</button>
    {open && <Modal className="xu-exchange-modal" title={t("Đổi xu")} onClose={close}>
      <div className="xu-exchange-body">
        <p className="xu-exchange-intro">{t("Chuyển Xu vàng thành Xu xanh để đổi quà bạn thích.")}</p>
        <ol className="xu-exchange-steps" aria-label={t("Các bước đổi Xu")}>
          <li className={quote ? "is-complete" : "is-current"} aria-current={!quote ? "step" : undefined}><span>{quote ? <Check size={14} aria-hidden="true"/> : "1"}</span>{t("Nhập số Xu")}</li>
          <li className={quote ? "is-current" : ""} aria-current={quote ? "step" : undefined}><span>2</span>{t("Xác nhận giao dịch")}</li>
        </ol>
        {displayedPolicy ? <div className="xu-exchange-policy">
          <div><span>{t("Tỷ lệ gốc")}</span><strong>{displayedPolicy.goldUnits.toLocaleString(language === "en" ? "en-US" : "vi-VN")} {t("vàng")} <span className="xu-exchange-equals">=</span> {displayedPolicy.greenUnits.toLocaleString(language === "en" ? "en-US" : "vi-VN")} {t("xanh")}</strong></div>
          <div><span>{t("Hạng")}: {t(configuredTierName(displayedPolicy, language))}</span><strong className="xu-exchange-bonus">+{displayedPolicy.bonusPercent}% <small>{t("Thưởng đổi Xu")}</small></strong></div>
        </div> : policy.isPending ? <div className="xu-exchange-loading" role="status" aria-label={t("Đang tải dữ liệu…")}><span/><span/></div> : <div className="xu-exchange-error" role="alert"><p>{t("Chưa tải được tỷ lệ đổi Xu.")}</p><button className="btn ghost" onClick={() => void policy.refetch()}>{t("Thử lại")}</button></div>}
        {quote ? <>
          <div className="note xu-exchange-review">
            <div><span>{t("Bạn sẽ đổi")}</span><strong className={quote.goldAmountXu >= 1e9 ? "is-large" : undefined}><XuAmount amount={quote.goldAmountXu}/></strong><small>{t("Xu vàng")}</small></div>
            <ArrowRight size={22} aria-hidden="true"/>
            <div><span>{t("Xu xanh nhận")}</span><strong className={quote.green >= 1e9 ? "is-large" : undefined}><XuAmount amount={quote.green} currency="green"/></strong><small>{t("Xu xanh")}</small></div>
          </div>
          <div className="xu-exchange-remaining"><span>{t("Xu vàng còn lại")}</span><XuAmount amount={available - quote.goldAmountXu}/></div>
          {uncertain && <p className="xu-exchange-error" role="status">{t("Chưa xác nhận được kết quả. Thử lại giữ nguyên yêu cầu, không trừ Xu hai lần.")}</p>}
        </> : <form id={`${inputId}-form`} className="stack" onSubmit={e => { e.preventDefault(); if (canExchange && rate) { setError(""); setQuote({ goldAmountXu: Number(amount), expectedPolicyId: rate.id, expectedTierCode: rate.tierCode, expectedCashbackPolicyId: rate.cashbackPolicyId, green: received, policy: rate }); } }}>
          <div className="xu-exchange-entry">
            <label htmlFor={inputId}>{t("Số Xu vàng muốn đổi")}</label>
            <div className={`xu-exchange-input${invalidAmount ? " is-invalid" : ""}`}>
              <input id={inputId} inputMode="numeric" autoComplete="off" placeholder="0" value={amount} maxLength={13} required aria-invalid={invalidAmount} aria-describedby={`${inputId}-balance${invalidAmount ? ` ${inputId}-error` : ""}`} onChange={e => { setAmount(e.target.value); setError(""); }}/>
              <span>{t("Xu vàng")}</span>
            </div>
            <div id={`${inputId}-balance`} className="xu-exchange-balance"><span>{t("Xu vàng khả dụng")}: <b className="num">{xu(available, language)}</b></span><button type="button" disabled={!selectableBalance} onClick={() => { setAmount(String(Math.min(available, 1e12))); setError(""); }}>{t("Dùng tất cả")}</button></div>
            <div className="xu-exchange-presets" role="group" aria-label={t("Chọn nhanh số Xu")}>
              {[25, 50, 75].map(percent => {
                const preset = Math.floor(Math.min(available, 1e12) * percent / 100);
                return <button key={percent} type="button" disabled={!selectableBalance || preset < 1} aria-pressed={amount === String(preset)} onClick={() => { setAmount(String(preset)); setError(""); }}>{percent}%</button>;
              })}
            </div>
            {invalidAmount && <p id={`${inputId}-error`} className="err" aria-live="polite">{t("Nhập số Xu nguyên, đủ số dư; Xu nhận phải từ 1 đến 1.000.000.000.000.")}</p>}
          </div>
          <div className="xu-exchange-receive" aria-live="polite" aria-atomic="true"><div><span>{t("Xu xanh nhận")}</span><small>{t("Đã bao gồm thưởng theo hạng")}</small></div><strong className={received >= 1e9 ? "is-large" : undefined}><XuAmount amount={received} currency="green"/></strong></div>
          <div className="xu-exchange-notice"><Info size={17} aria-hidden="true"/><p>{t("Chỉ đổi một chiều. Xu xanh dùng đổi quà và không thể rút.")}</p></div>
          {error && <p className="xu-exchange-error" role="alert">{t(error)}</p>}
        </form>}
        {quote && <>
          <div className="xu-exchange-notice"><Info size={17} aria-hidden="true"/><p>{t("Chỉ đổi một chiều. Xu xanh dùng đổi quà và không thể rút.")}</p></div>
          {error && <p className="xu-exchange-error" role="alert">{t(error)}</p>}
        </>}
      </div>
      <div className="xu-exchange-footer">
        {quote ? <><button className="btn xu-exchange-submit" disabled={busy} aria-busy={busy} onClick={() => void send()}>{t(busy ? "Đang xử lý…" : uncertain ? "Kiểm tra yêu cầu" : "Xác nhận đổi")}<ArrowRight size={18} aria-hidden="true"/></button>{!uncertain && <button className="xu-exchange-back" disabled={busy} onClick={() => setQuote(null)}>{t("Quay lại")}</button>}</> : <button type="submit" form={`${inputId}-form`} className="btn xu-exchange-submit" disabled={!canExchange}>{t("Xem lại giao dịch")}<ArrowRight size={18} aria-hidden="true"/></button>}
      </div>
    </Modal>}
  </>;
}

export function XuExchangePolicy({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["/admin/xu-exchange-policies/current", ctx.me?.id], queryFn: () => api<Policy>("/admin/xu-exchange-policies/current") });
  return <Card title={t("Tỷ lệ đổi Xu")}>{q.isPending ? <p role="status">{t("Đang tải dữ liệu…")}</p> : q.isError || !q.data?.id ? <><p className="err">{t("Chưa tải được tỷ lệ đổi Xu.")}</p><button className="btn ghost" onClick={() => void q.refetch()}>{t("Thử lại")}</button></> : <PolicyEditor key={q.data.id} policy={q.data} ctx={ctx} reload={() => void q.refetch()} />}</Card>;
}
function PolicyEditor({ policy, ctx, reload }: { policy: Policy; ctx: AppContext; reload: () => void }) {
  const { t } = useI18n();
  const [gold, setGold] = useState(String(policy.goldUnits));
  const [green, setGreen] = useState(String(policy.greenUnits));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <form className="stack" onSubmit={async e => {
    e.preventDefault(); if (busy) return;
    if ([gold, green].some(n => !/^\d+$/.test(n) || Number(n) < 1 || Number(n) > 1e6)) { setError(t("Mỗi giá trị tỷ lệ phải là số nguyên từ 1 đến 1.000.000.")); return; }
    setBusy(true); setError("");
    try { await ctx.act("/admin/xu-exchange-policies", "POST", { currentVersionId: policy.id, goldUnits: Number(gold), greenUnits: Number(green) }); reload(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }}>
    <AdminUnsavedChanges dirty={!busy&&(gold!==String(policy.goldUnits)||green!==String(policy.greenUnits))}/>
    <p className="small mute">{t("Phiên bản")}: {policy.id}</p>
    <div className="xu-rate-inputs"><label className="field">{t("Xu vàng")}<input className="inp" type="number" min={1} max={1e6} step={1} required value={gold} disabled={busy} onChange={e => setGold(e.target.value)} /></label><span>=</span><label className="field">{t("Xu xanh")}<input className="inp" type="number" min={1} max={1e6} step={1} required value={green} disabled={busy} onChange={e => setGreen(e.target.value)} /></label></div>
    <p className="small mute">{t("Xu xanh nhận được làm tròn xuống. Giao dịch đã thành công giữ nguyên tỷ lệ đã dùng.")}</p>
    {error && <div role="alert"><p className="err">{t(error)}</p><button className="btn ghost" type="button" onClick={reload}>{t("Thử lại")}</button></div>}
    <button className="btn" disabled={busy}>{t(busy ? "Đang lưu…" : "Lưu tỷ lệ đổi Xu")}</button>
  </form>;
}
