"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { components } from "@/lib/api-schema";
import { api, date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { tierName, shareRange } from "@/lib/cashback";
import { Card } from "./ui";
import type { AppContext } from "./hoanxu";
type Policy = components["schemas"]["CashbackPolicy"];
export function CashbackPolicy({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const q = useQuery<Policy>({
    queryKey: ["/admin/cashback-policies/current"],
    queryFn: () => api("/admin/cashback-policies/current"),
  });
  if (q.isPending)
    return (
      <Card title={t("Chính sách chia hoa hồng theo hạng")}>
        <p role="status">{t("Đang tải dữ liệu…")}</p>
      </Card>
    );
  if (q.error || !q.data?.id || q.data.tiers?.length !== 3)
    return (
      <Card title={t("Chính sách chia hoa hồng theo hạng")}>
        <p className="err" role="alert">
          {q.error?.message || t("Chưa tải được chính sách hạng.")}
        </p>
        <button className="btn ghost" onClick={() => void q.refetch()}>
          {t("Thử lại")}
        </button>
      </Card>
    );
  return (
    <PolicyEditor
      key={q.data.id}
      policy={q.data}
      ctx={ctx}
      reload={() => q.refetch()}
    />
  );
}
function PolicyEditor({
  policy,
  ctx,
  reload,
}: {
  policy: Policy;
  ctx: AppContext;
  reload: () => unknown;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState(
    policy.tiers.map((row) => ({
      ...row,
      minApprovedOrders: String(row.minApprovedOrders),
      minSharePercent: String(row.minSharePercent),
      maxSharePercent: String(row.maxSharePercent),
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(
    i: number,
    field: "minApprovedOrders" | "minSharePercent" | "maxSharePercent",
    value: string,
  ) {
    setRows(rows.map((r, n) => (n === i ? { ...r, [field]: value } : r)));
    setError("");
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await ctx.act("/admin/cashback-policies", "POST", {
        currentVersionId: policy.id,
        tiers: rows.map((r) => ({
          ...r,
          minApprovedOrders: Number(r.minApprovedOrders),
          minSharePercent: Number(r.minSharePercent),
          maxSharePercent: Number(r.maxSharePercent),
        })),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title={t("Chính sách chia hoa hồng theo hạng")}>
      <p className="small mute">
        {t("Phiên bản")}: {policy.id} · {date(policy.createdAt)}
      </p>
      <p className="note">
        {t(
          "Tỷ lệ chia tính trên hoa hồng sàn thực nhận. Link đã tạo giữ hạng và khoảng cũ; mỗi đơn random một lần khi ghi nhận.",
        )}
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="tier-policy-grid">
          {rows.map((r, i) => (
            <fieldset
              className="tier-policy-row stack"
              key={r.tierCode}
              disabled={busy}
            >
              <legend>{t(tierName(r.tierCode))}</legend>
              <label className="field">
                {t("Số đơn đã duyệt tối thiểu")}
                <input
                  className="inp"
                  type="number"
                  required
                  min={0}
                  max={1000000000}
                  step={1}
                  value={r.minApprovedOrders}
                  readOnly={i === 0}
                  onChange={(e) =>
                    update(i, "minApprovedOrders", e.target.value)
                  }
                />
              </label>
              <label className="field">
                {t("Tỷ lệ tối thiểu (%)")}
                <input
                  className="inp"
                  type="number"
                  required
                  min={0}
                  max={100}
                  step="0.01"
                  value={r.minSharePercent}
                  onChange={(e) => update(i, "minSharePercent", e.target.value)}
                />
              </label>
              <label className="field">
                {t("Tỷ lệ tối đa (%)")}
                <input
                  className="inp"
                  type="number"
                  required
                  min={0}
                  max={100}
                  step="0.01"
                  value={r.maxSharePercent}
                  onChange={(e) => update(i, "maxSharePercent", e.target.value)}
                />
              </label>
            </fieldset>
          ))}
        </div>
        <div
          className="note stack"
          role="region"
          aria-label={t("Xem trước chính sách")}
        >
          {rows.map((r) => (
            <p key={r.tierCode}>
              {t(tierName(r.tierCode))}: {r.minApprovedOrders}{" "}
              {t("đơn đã duyệt")} ·{" "}
              {shareRange(r.minSharePercent, r.maxSharePercent)}
            </p>
          ))}
          <p>{t("Chính sách mới áp dụng cho link tạo sau khi lưu.")}</p>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? t("Đang lưu…") : t("Lưu chính sách mới")}
          </button>
        </div>
      </form>
      {error && (
        <div>
          <p className="err" role="alert">
            {error}
          </p>
          <button className="btn ghost" onClick={() => reload()}>
            {t("Tải lại chính sách")}
          </button>
        </div>
      )}
    </Card>
  );
}
