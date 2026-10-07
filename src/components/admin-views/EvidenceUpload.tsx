"use client";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import type { AppContext } from "../app-context";
export function EvidenceUpload({ ctx }: {
    ctx: AppContext;
}) {
    const { t } = useI18n();
    const [id, setId] = useState("");
    return (<div className="evidence-upload">
      <h3>{t("Tải bằng chứng chuyển khoản")}</h3>
      <p className="small mute">{t("PNG, JPEG hoặc PDF, tối đa 10 MB.")}</p>
      <input className="inp" aria-label={t("Bằng chứng chuyển khoản")} type="file" accept="image/png,image/jpeg,application/pdf" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f)
                return;
            const form = new FormData();
            form.set("file", f);
            try {
                const v = await ctx.act("/admin/private-files", "POST", form);
                setId(v.id);
            }
            catch { }
            e.target.value = "";
        }}/>
      {id && (<p>
          {t("Mã bằng chứng:")}
          <code>{id}</code>
          <button className="btn sm ghost" onClick={() => navigator.clipboard.writeText(id)}>
            {t("Sao chép")}
          </button>
        </p>)}
    </div>);
}
