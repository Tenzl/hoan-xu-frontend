"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Flame, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { XuAmount } from "./xu-amount";
import { xu } from "./leaderboard";
import type { AppContext } from "./hoanxu";

const milestones = [
  { days: 3, bonus: 600, flame: "orange" },
  { days: 7, bonus: 1500, flame: "red" },
  { days: 14, bonus: 3000, flame: "violet" },
  { days: 30, bonus: 9000, flame: "gold" },
] as const;

function FlameMark({ ornate = false }: { ornate?: boolean }) {
  const id = useId().replaceAll(":", "");
  return (
    <span
      className={"checkin-flame" + (ornate ? " ornate" : "")}
      aria-hidden="true"
    >
      {ornate && <Sparkles className="flame-sparkles" size={62} />}
      <svg width="0" height="0" className="flame-defs">
        <defs>
          <linearGradient id={id} x1="0" y1="1" x2="0.7" y2="0">
            <stop stopColor="var(--flame-color)" />
            <stop offset="1" stopColor="var(--flame-tip)" />
          </linearGradient>
        </defs>
      </svg>
      <Flame size={38} strokeWidth={1.5} fill={`url(#${id})`} />
    </span>
  );
}

function currentStreak(data: components["schemas"]["CheckinState"]) {
  if (!data.today) return data.streak;
  const yesterday = new Date(Date.parse(data.today + "T00:00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10);
  return data.lastDay === data.today || data.lastDay === yesterday
    ? data.streak
    : 0;
}

export function DashboardCheckin({ ctx, compact = false }: { ctx: AppContext; compact?: boolean }) {
  const { t, language } = useI18n();
  const greenXu = (value: number) => `${value.toLocaleString(language === "en" ? "en-US" : "vi-VN")} ${t("Xu xanh")}`;
  const query = useQuery({
    queryKey: ["/checkins",ctx.me?.id],
    queryFn: () => api<components["schemas"]["CheckinState"]>("/checkins"),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const { refetch } = query;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = Date.now();
      const vietnamMidnight =
        (Math.floor((now + 7 * 3600000) / 86400000) + 1) * 86400000 -
        7 * 3600000;
      timer = setTimeout(
        () => {
          void refetch();
          schedule();
        },
        vietnamMidnight - now + 100,
      );
    };
    const refresh = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    schedule();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refetch]);

  const data = query.data;
  const streak = data ? currentStreak(data) : 0;
  const checked =
    data?.checkedIn === true && (!data.today || data.lastDay === data.today);
  const reached = milestones.filter((m) => streak >= m.days).at(-1);
  const next = milestones.find((m) => streak < m.days);
  const bonus = milestones.find((m) => m.days === streak + 1)?.bonus || 0;
  const flame = reached?.flame || "orange";
  return (
    <section
      className={"card dashboard-checkin" + (compact ? " checkin-compact" : "")}
      aria-label={t("Điểm danh nhận Xu xanh")}
      data-flame={flame}
    >
      {query.isPending ? (
        <div className="checkin-loading" role="status">
          {t("Đang tải điểm danh…")}
        </div>
      ) : query.isError ? (
        <div role="alert">
          <p className="err">{t(query.error.message)}</p>
          <button className="btn sm ghost" onClick={() => void query.refetch()}>
            {t("Thử lại")}
          </button>
        </div>
      ) : (
        <>
          <div className="checkin-header">
            <div className="checkin-heading">
              <FlameMark ornate={streak >= 30} />
              <div>
                <p className="checkin-eyebrow">{t("Điểm danh nhận Xu xanh")}</p>
                <h2>
                  {checked ? t("Đã điểm danh hôm nay") : t("Nhận Xu xanh hôm nay")}
                </h2>
              </div>
            </div>
            <span className={"checkin-state" + (checked ? " is-done" : "")}>
              {checked ? (
                <Check size={14} aria-hidden="true" />
              ) : (
                <span className="checkin-state-dot" />
              )}
              {t(checked ? "Đã điểm danh" : "Chưa điểm danh hôm nay")}
            </span>
          </div>
          <div className="checkin-body">
            <div className="checkin-count">
              <strong className="num">{streak}</strong>
              <span>
                {t("ngày liên tiếp")}
                <small>
                  {t("Kỷ lục")}: {data?.best || 0} {t("ngày")}
                </small>
              </span>
            </div>
            <div className="checkin-action">
              <button
                className="btn xu"
                disabled={checked || busy || query.isFetching}
                onClick={async () => {
                  if (submitting.current || checked) return;
                  submitting.current = true;
                  setBusy(true);
                  setError("");
                  try {
                    const result = (await ctx.act(
                      "/checkins",
                    )) as components["schemas"]["CheckinResult"];
                    ctx.notify(
                      `${t("Đã nhận")} ${greenXu(result.awardXu)}`,
                    );
                  } catch (e) {
                    setError((e as Error).message);
                    if (
                      e instanceof ApiError &&
                      e.code === "ALREADY_CHECKED_IN"
                    )
                      await refetch();
                  } finally {
                    submitting.current = false;
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? t("Đang điểm danh…")
                  : checked
                    ? t("Đã điểm danh")
                    : `${t("Điểm danh")} +${greenXu(300 + bonus)}`}
              </button>
              <p className="small mute">
                {checked
                  ? t("Quay lại ngày mai để giữ chuỗi.")
                  : bonus
                    ? `${t("Gồm thưởng mốc")} +${xu(bonus, language)}`
                    : t("Nhận 300 Xu xanh mỗi ngày")}
              </p>
            </div>
          </div>
          {error && (
            <p className="err checkin-error" role="alert">
              {t(error)}
            </p>
          )}
          {compact && <Link className="text-link" href="/checkin">{t("Xem mốc thưởng điểm danh")} →</Link>}
          <div className="checkin-details" hidden={compact}>
          <div className="checkin-progress-heading">
            <h3>{t("Thưởng mốc chuỗi")}</h3>
            <span className="small mute">
              {next ? (
                <>
                  {t("Còn")} {next.days - streak} {t("ngày đến mốc")}{" "}
                  {next.days}
                </>
              ) : (
                t("Đã đạt tất cả mốc thưởng")
              )}
            </span>
          </div>
          <div
            className="checkin-progress"
            role="progressbar"
            aria-label={t("Tiến độ chuỗi điểm danh")}
            aria-valuemin={0}
            aria-valuemax={30}
            aria-valuenow={Math.min(streak, 30)}
            aria-valuetext={`${streak} ${t("ngày liên tiếp")}`}
          >
            <span
              className="checkin-progress-fill"
              style={{ transform: `scaleX(${Math.min(streak, 30) / 30})` }}
            />
            {milestones.map((m) => (
              <span
                key={m.days}
                className={
                  "checkin-progress-tick" +
                  (streak >= m.days ? " is-reached" : "")
                }
                style={{ left: `${(m.days / 30) * 100}%` }}
              />
            ))}
          </div>
          <ol className="checkin-milestones">
            {milestones.map((m) => (
              <li
                key={m.days}
                data-flame={m.flame}
                className={streak >= m.days ? "is-reached" : "is-locked"}
              >
                <FlameMark ornate={m.days === 30} />
                <div>
                  <b>
                    {m.days} {t("ngày")}
                  </b>
                  <XuAmount amount={m.bonus} currency="green" signed/>
                  <small>
                    {streak >= m.days ? (
                      <>
                        <Check size={12} aria-hidden="true" />
                        {t("Đã đạt")}
                      </>
                    ) : (
                      t("Chưa đạt")
                    )}
                  </small>
                </div>
              </li>
            ))}
          </ol>
          <p className="checkin-rule small mute">
            {t(
              "Bỏ một ngày bắt đầu lại chuỗi. Mốc được thưởng một lần trong mỗi chuỗi.",
            )}
          </p>
          </div>
        </>
      )}
    </section>
  );
}
