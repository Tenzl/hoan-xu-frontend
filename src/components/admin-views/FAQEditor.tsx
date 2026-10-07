"use client";
import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import type { AppContext } from "../app-context";
import { Card, type Data } from "../ui";
export function FAQEditor({ settings, ctx }: {
    settings: Data;
    ctx: AppContext;
}) {
    const { t } = useI18n();
    const signature = JSON.stringify(settings.faq || []);
    const [items, setItems] = useState<{
        question: string;
        answer: string;
    }[]>(settings.faq || []);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        setItems(JSON.parse(signature));
    }, [signature]);
    function update(index: number, field: "question" | "answer", value: string) {
        setItems(items.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    }
    return (<Card title={t("Câu hỏi thường gặp")}>
      <form className="stack" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
                await ctx.act("/admin/settings", "PUT", {
                    brand: settings.brand,
                    supportEmail: settings.supportEmail,
                    maxDisplayPercent: settings.maxDisplayPercent,
                    faq: items,
                });
            }
            catch {
            }
            finally {
                setBusy(false);
            }
        }}>
        {items.map((row, i) => (<div className="stack" key={i}>
            <label className="field">
              {t("Câu hỏi")}
              {i + 1}
              <input className="inp" required maxLength={150} value={row.question} onChange={(e) => update(i, "question", e.target.value)}/>
            </label>
            <label className="field">
              {t("Câu trả lời")}
              <textarea className="inp" required maxLength={1000} value={row.answer} onChange={(e) => update(i, "answer", e.target.value)}/>
            </label>
            <div>
              <button type="button" className="btn sm ghost" onClick={() => setItems(items.filter((_, n) => n !== i))}>
                {t("Xóa câu hỏi")}
              </button>
            </div>
          </div>))}
        <div className="row wrap">
          <button type="button" className="btn ghost" disabled={items.length >= 20} onClick={() => setItems([...items, { question: "", answer: "" }])}>
            {t("Thêm câu hỏi")}
          </button>
          <button className="btn" disabled={busy}>
            {busy ? t("Đang lưu…") : t("Lưu FAQ")}
          </button>
        </div>
      </form>
    </Card>);
}
