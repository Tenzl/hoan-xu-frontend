"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { GiftIcon } from "./gift-icon";

export function validGiftImageUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return value.length <= 2048 && !/\s/.test(value) && url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function GiftImage({ src = "", name, preview = false, positionY = 50 }: { src?: string; name: string; preview?: boolean; positionY?: number }) {
  return <GiftImageContent key={src} src={src} name={name} preview={preview} positionY={positionY}/>;
}
function GiftImageContent({ src, name, preview, positionY }: { src: string; name: string; preview: boolean; positionY: number }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!!src);
  const usable = !!src && validGiftImageUrl(src) && !failed;
  return <span className={`gift-picture${preview ? " preview" : ""}`}>
    <span className="gift-picture-frame">
      {usable ? <img src={src} alt={t("Ảnh {name}").replace("{name}", name || t("Quà"))} style={{ objectPosition: `50% ${Number.isFinite(positionY) ? Math.max(0, Math.min(100, positionY)) : 50}%` }} referrerPolicy="no-referrer" loading={preview ? "eager" : "lazy"} decoding="async" onLoad={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }}/> : <GiftIcon width={28} height={28}/>}
    </span>
    {preview && <span className="gift-picture-caption" role="status">{t(!src ? "Ảnh xem trước" : !usable ? "Không tải được ảnh. Kiểm tra lại đường dẫn." : loading ? "Đang tải ảnh…" : "Ảnh quà sẽ hiển thị như trên.")}</span>}
  </span>;
}

export function GiftImageEditor({ src, name, positionY, onChange, disabled = false }: { src: string; name: string; positionY: number; onChange: (value: number) => void; disabled?: boolean }) {
  const { t } = useI18n();
  const positionId = useId();
  const drag = useRef<{ pointerId: number; y: number; position: number; overflow: number } | null>(null);
  useEffect(() => { drag.current = null; }, [src, disabled]);
  const usable = !!src && validGiftImageUrl(src);
  return <div className="gift-image-editor">
    <div className={`gift-image-drag${disabled || !usable ? " is-disabled" : ""}`} onPointerDown={event => {
      if (disabled || !usable || !event.isPrimary || event.button !== 0 || !(event.target as Element).closest(".gift-picture-frame")) return;
      const image = event.currentTarget.querySelector("img");
      if (!image?.complete || !image.naturalWidth || !image.naturalHeight) return;
      const rect = image.getBoundingClientRect();
      const overflow = image.naturalHeight * Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight) - rect.height;
      if (overflow < 1) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointerId: event.pointerId, y: event.clientY, position: positionY, overflow };
    }} onPointerMove={event => {
      const start = drag.current;
      if (!start || start.pointerId !== event.pointerId || disabled) return;
      onChange(Math.round(Math.max(0, Math.min(100, start.position - (event.clientY - start.y) / start.overflow * 100))));
    }} onPointerUp={event => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      drag.current = null;
    }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}>
      <GiftImage src={src} name={name} positionY={positionY} preview/>
    </div>
    <p className="gift-image-hint">{t("Kéo ảnh lên hoặc xuống để chọn phần hiển thị trên thẻ quà.")}</p>
    <div className="gift-image-position"><span><label htmlFor={positionId}>{t("Vị trí ảnh theo chiều dọc")}</label><output className="num" htmlFor={positionId}>{positionY}%</output></span><input id={positionId} type="range" min="0" max="100" step="1" value={positionY} disabled={disabled || !usable} onChange={event => onChange(Number(event.target.value))}/></div>
    <div className="gift-image-position-labels"><span>{t("Phía trên")}</span><button type="button" className="btn sm ghost" disabled={disabled || !usable || positionY === 50} onClick={() => onChange(50)}>{t("Về giữa")}</button><span>{t("Phía dưới")}</span></div>
  </div>;
}

export function GiftDescription({ text = "" }: { text?: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setCanExpand(element.scrollHeight > parseFloat(getComputedStyle(element).lineHeight) * 3 + 2);
    const observer = new ResizeObserver(update);
    observer.observe(element); update();
    return () => observer.disconnect();
  }, [text]);
  if (!text) return null;
  return <div className="gift-description"><p ref={ref} className={expanded ? "expanded" : "clamped"}>{text}</p>{canExpand && <button type="button" className="gift-description-toggle" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{t(expanded ? "Thu gọn" : "Xem thêm")}</button>}</div>;
}
