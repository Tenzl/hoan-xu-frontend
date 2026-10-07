"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { GiftIcon } from "./gift-icon";

export function validGiftImageUrl(value: string) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return value.length <= 2048 && !/\s/.test(value) && url.protocol === "https:" && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}

export function GiftImage({ src = "", name, preview = false }: { src?: string; name: string; preview?: boolean }) {
  return <GiftImageContent key={src} src={src} name={name} preview={preview}/>;
}
function GiftImageContent({ src, name, preview }: { src: string; name: string; preview: boolean }) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!!src);
  const usable = !!src && validGiftImageUrl(src) && !failed;
  return <span className={`gift-picture${preview ? " preview" : ""}`}>
    <span className="gift-picture-frame">
      {usable ? <img src={src} alt={t("Ảnh {name}").replace("{name}", name || t("Quà"))} referrerPolicy="no-referrer" loading={preview ? "eager" : "lazy"} decoding="async" onLoad={() => setLoading(false)} onError={() => { setFailed(true); setLoading(false); }}/> : <GiftIcon width={28} height={28}/>}
    </span>
    {preview && <span className="gift-picture-caption" role="status">{t(!src ? "Ảnh xem trước" : !usable ? "Không tải được ảnh. Kiểm tra lại đường dẫn." : loading ? "Đang tải ảnh…" : "Ảnh quà sẽ hiển thị như trên.")}</span>}
  </span>;
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
