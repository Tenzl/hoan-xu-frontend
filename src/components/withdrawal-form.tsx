"use client";
import { useState } from "react";
import Link from "next/link";
import { bankOptions } from "@/lib/banks";
import { useI18n } from "@/lib/i18n";
import type { AppContext } from "./hoanxu";
import { XuAmount } from "./xu-amount";
import { Form } from "./ui";

export function WithdrawalForm({ ctx, available, debt = 0, onSuccess }: { ctx: AppContext; available: number; debt?: number; onSuccess?: () => void }) {
  const { t } = useI18n();
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const blocked = debt > 0 || available < 50000;
  return <div className="stack">
    <div className="withdrawal-progress"><label htmlFor="withdrawal-minimum">{t("Tiến độ đạt ngưỡng rút tiền")}</label><progress id="withdrawal-minimum" aria-label={t("Tiến độ đạt ngưỡng rút tiền")} max={50000} value={Math.min(50000,Math.max(0,available))} aria-valuemin={0} aria-valuemax={50000} aria-valuenow={Math.min(50000,Math.max(0,available))}/>{available < 50000 && <p className="small mute">{t("Còn thiếu")} <XuAmount amount={Math.max(0,50000-available)}/></p>}</div>
    <p className="small mute">{t("1 Xu vàng = 1đ. Rút tối thiểu 50.000 Xu vàng, theo bội số 1.000.")}</p>
    {blocked && <p className="note">{t(debt > 0 ? "Cần xử lý khoản thiếu trước khi rút." : "Bạn cần ít nhất 50.000 Xu vàng khả dụng để rút tiền.")}</p>}
    <Form fields={[
      { name: "bank", label: t("Ngân hàng"), searchOptions: bankOptions, placeholder: "Tìm và chọn ngân hàng" },
      { name: "account", label: t("Số tài khoản"), max: 20 },
      { name: "holder", label: t("Họ tên đầy đủ hiển thị trên ngân hàng"), uppercase: true, max: 80 },
      { name: "amount", label: t("Số Xu vàng muốn rút"), type: "number", min: 50000, max: Math.max(50000, available), step: 1000 },
    ]} initial={{ ...ctx.me?.bankDetails }} busy={blocked} submit={t("Gửi yêu cầu rút tiền")} onSubmit={async (value) => {
      setError("");
      if (blocked || value.amount > available || value.amount % 1000 !== 0 || !/^\d{6,20}$/.test(value.account)) { setError(t("Thông tin rút tiền không hợp lệ.")); return; }
      try { await ctx.act("/withdrawals", "POST", value); setSubmitted(true); onSuccess?.(); } catch (e) { setError((e as Error).message); }
    }} />
    {error && <p className="err" role="alert">{t(error)}</p>}
    {submitted && <p className="history-success" role="status">{t("Đã gửi yêu cầu rút tiền.")} <Link href="/history?tab=withdrawals">{t("Xem yêu cầu trong Lịch sử")}</Link></p>}
    <p className="small mute">{t("Xu được giữ cho yêu cầu rút tiền. Theo dõi tiến độ trong Lịch sử nhé.")}</p>
  </div>;
}
