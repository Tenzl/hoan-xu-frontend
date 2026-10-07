"use client";
import { useEffect, useId, useState } from "react";
import { useI18n } from "@/lib/i18n";

export function XuIcon({ currency = "gold" }: { currency?: "gold" | "green" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const id = useId();
  const [position,setPosition] = useState({left:0,top:0});
  useEffect(()=>{if(!open)return;const close=()=>setOpen(false);window.addEventListener("scroll",close,true);window.addEventListener("resize",close);return()=>{window.removeEventListener("scroll",close,true);window.removeEventListener("resize",close);};},[open]);
  const label = t(currency === "gold" ? "Xu vàng" : "Xu xanh");
  return <span className={`xu-icon-wrap is-${currency}`}>
    <button type="button" className="xu-icon" aria-label={label} aria-expanded={open} aria-describedby={open ? id : undefined} onClick={event => {const rect=event.currentTarget.getBoundingClientRect();setPosition({left:Math.max(12,Math.min(window.innerWidth - 232,rect.left-100)),top:rect.top>100?rect.top-88:rect.bottom+8});setOpen(v=>!v);}} onBlur={() => setOpen(false)} onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle className="xu-coin-ring" cx="12" cy="12" r="7.5"/>{currency === "gold" ? <path className="xu-coin-mark" d="m12 6 1.8 3.7 4.1.6-3 2.9.7 4.1-3.6-1.9-3.6 1.9.7-4.1-3-2.9 4.1-.6Z"/> : <path className="xu-coin-mark" d="M8 16C5 9 11 7 17 7c0 6-2 10-9 9Zm0 0 7-7"/>}</svg>
    </button>
    {open && <span id={id} className="xu-tooltip" role="tooltip" style={position}>{t(currency === "gold" ? "Xu vàng: 1 Xu = 1đ. Có thể rút khi đủ điều kiện." : "Xu xanh dùng đổi quà, không thể rút tiền.")}</span>}
  </span>;
}
export function XuAmount({ amount, currency = "gold", signed = false }: { amount?: number; currency?: "gold" | "green"; signed?: boolean }) {
  const { language } = useI18n();
  const value = (amount || 0).toLocaleString(language === "en" ? "en-US" : "vi-VN");
  return <span className="xu-amount"><span className="num">{signed && (amount || 0) > 0 ? "+" : ""}{value}</span><XuIcon currency={currency}/></span>;
}
