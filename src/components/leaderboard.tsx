"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, Crown, Medal, Sparkles, Trophy, Users, Zap } from "lucide-react";
import { api, type User } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";

export type Leaderboard = components["schemas"]["Leaderboard"];
type Entry = components["schemas"]["LeaderboardEntry"];
type Position = components["schemas"]["LeaderboardPosition"];
const periods = ["week", "month", "all"] as const;
type Period = typeof periods[number];
export function xu(value: number, language = "vi") {
  return value.toLocaleString(language === "en" ? "en-US" : "vi-VN") + " Xu";
}
function initials(name: string) {
  return name.trim().split(/\s+/u).map(part => Array.from(part)[0]).slice(-2).join("").toLocaleUpperCase();
}
function Retry({ error, retry }: { error: Error; retry: () => unknown }) {
  const { t } = useI18n();
  return <div className="top-error" role="alert"><p>{t(error.message)}</p><button className="btn sm ghost" onClick={retry}>{t("Thử lại")}</button></div>;
}
export function TopSkeleton() {
  const { t } = useI18n();
  return <div className="top-skeleton" role="status" aria-label={t("Đang tải cuộc đua…")}><div className="top-skeleton-podium"><span /><span /><span /></div><div className="top-skeleton-line" /><div className="top-skeleton-chart" /></div>;
}

function Podium({ items }: { items: Entry[] }) {
  const { t, language } = useI18n();
  function podiumXu(amount: number) {
    if (amount < 10000000) return xu(amount, language);
    const divisor = amount >= 1000000000 ? 1000000000 : 1000000;
    return (amount / divisor).toLocaleString(language === "en" ? "en-US" : "vi-VN", { maximumFractionDigits: 2 }) + " " + t(divisor === 1000000000 ? "tỷ" : "triệu") + " Xu";
  }
  return <div className="top-podium" aria-label={t("Bục vinh danh top 3")}>
    {[2, 1, 3].map(place => {
      const entry = items[place - 1];
      return <article key={place} className={`top-place top-place-${place}${entry ? "" : " top-vacant"}`}>
        <div className="top-place-badge">{place === 1 ? <Crown size={18} /> : <Medal size={16} />}<span>TOP {place}</span></div>
        {entry ? <>
          <div className="top-avatar" aria-hidden="true">{initials(entry.name)}</div>
          <h3 title={entry.name}>{entry.name}</h3>
          <strong className="top-amount num" title={xu(entry.xu, language)} aria-label={xu(entry.xu, language)}>{podiumXu(entry.xu)}</strong>
          <p>{entry.orders} {t("đơn được duyệt")}</p>
        </> : <><div className="top-avatar" aria-hidden="true"><Trophy size={24} /></div><h3>{t("Chờ người bứt phá")}</h3><p>{t("Vị trí đang chờ bạn")}</p></>}
        <span className="top-place-number" aria-hidden="true">{place.toString().padStart(2, "0")}</span>
      </article>;
    })}
  </div>;
}

function Personal({ me, position, pending, error, retry }: { me?: User; position?: Position; pending: boolean; error: Error | null; retry: () => unknown }) {
  const { t, language } = useI18n();
  const customer = me?.role === "customer";
  const target = position?.target;
  return <section className="top-personal" aria-labelledby="top-personal-title">
    <div className="top-personal-icon" aria-hidden="true"><Zap size={24} /></div>
    <div className="top-personal-body">
      <p className="top-eyebrow" id="top-personal-title">{t("VỊ TRÍ CỦA BẠN")}</p>
      {pending ? <p role="status">{t("Đang kiểm tra vị trí của bạn…")}</p> : !customer ? <>
        <h2>{t("Cuộc đua sẽ thú vị hơn khi có bạn")}</h2>
        <p>{t("Đăng nhập để theo dõi Hoàn Xu tích lũy và mục tiêu lên hạng.")}</p>
      </> : error ? <Retry error={error} retry={retry} /> : position ? <>
        <div className="top-personal-stat"><h2>{position.rank ? `#${position.rank}` : t("Chưa có hạng")}</h2><strong className="num">{xu(position.xu, language)}</strong></div>
        {!position.rank ? <p>{t("Đơn đầu tiên được duyệt sẽ đưa bạn vào cuộc đua.")}</p> : position.rank === 1 ? <p><b>{t("Bạn đang dẫn đầu kỳ này")}</b>{position.lead !== null && <> · {t("Hơn hạng 2")} <b>{xu(position.lead, language)}</b></>}</p> : target && <>
          <p>{t("Thêm")} <b>{xu(position.xuToNext ?? 0, language)}</b> {t("để vượt hạng")} <b>#{target.rank}</b></p>
          <progress aria-label={t("Tiến độ lên hạng")} value={position.xu} max={target.xu + 1} />
        </>}
      </> : null}
    </div>
    {!pending && (customer ? <Link className="btn" href="/link">{t("Lấy link tích lũy Xu")}<ArrowUpRight size={17} /></Link> : <Link className="btn" href="/login">{t("Đăng nhập để xem hạng của bạn")}<ArrowUpRight size={17} /></Link>)}
  </section>;
}

function TopChart({ items }: { items: Entry[] }) {
  const { t, language } = useI18n();
  const max = items[0]?.xu || 1;
  return <section className="card top-chart-card" aria-labelledby="top-chart-title">
    <div className="top-section-head"><div><p className="top-eyebrow">{t("NHÌN THẤY MỤC TIÊU")}</p><h2 id="top-chart-title">{t("Tích lũy của top 10")}</h2></div><span className="top-chip">{t("Hoàn Xu đã duyệt")}</span></div>
    <figure className="top-chart" role="img" aria-label={t("Biểu đồ tích lũy top 10")}>
      {items.map(entry => <div className={`top-chart-row top-color-${Math.min(entry.rank, 4)}`} key={entry.id}>
        <div className="top-chart-label"><span><b>#{entry.rank}</b> {entry.name}</span><strong className="num">{xu(entry.xu, language)}</strong></div>
        <svg viewBox="0 0 1000 16" preserveAspectRatio="none" aria-hidden="true"><rect className="top-bar-track" x="0" y="0" width="1000" height="16" rx="8" /><rect className="top-bar" x="0" y="0" width={entry.xu / max * 1000} height="16" rx="8" /></svg>
      </div>)}
      <figcaption><span>0 Xu</span><span>{xu(max, language)}</span></figcaption>
    </figure>
  </section>;
}

function Ranking({ items, userId }: { items: Entry[]; userId?: string }) {
  const { t, language } = useI18n();
  return <section className="card top-ranking-card" aria-labelledby="top-ranking-title">
    <div className="top-section-head"><div><p className="top-eyebrow">{t("MỖI VỊ TRÍ, MỘT HÀNH TRÌNH")}</p><h2 id="top-ranking-title">{t("Bảng xếp hạng")}</h2></div><Trophy size={22} aria-hidden="true" /></div>
    <ol className="top-ranking">
      {items.map(entry => <li key={entry.id} className={`top-color-${Math.min(entry.rank, 4)}${entry.id === userId ? " top-self" : ""}`}>
        <span className="top-rank num">{entry.rank <= 3 ? <Medal size={19} aria-hidden="true" /> : null}#{entry.rank}</span>
        <div className="top-list-avatar" aria-hidden="true">{initials(entry.name)}</div>
        <div className="top-member"><b>{entry.name}</b>{entry.id === userId && <span className="top-you">{t("Bạn")}</span>}<span className="top-order-count">{entry.orders} {t("đơn được duyệt")}</span></div>
        <strong className="top-list-xu num">{xu(entry.xu, language)}</strong>
      </li>)}
    </ol>
  </section>;
}

export function LeaderboardScreen({ me, sessionPending }: { me?: User; sessionPending: boolean }) {
  const { t, language } = useI18n();
  const search = useSearchParams();
  const raw = search.get("period");
  const period: Period = periods.includes(raw as Period) ? raw as Period : "week";
  const [keyboard, setKeyboard] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const customer = me?.role === "customer";
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const board = useQuery<Leaderboard>({ queryKey: ["leaderboards", period, me?.id || "guest"], queryFn: () => api(`/leaderboards?period=${period}`), staleTime: 30000, refetchInterval: 60000 });
  const position = useQuery<Position>({ queryKey: ["my-leaderboard", period, me?.id], queryFn: () => api(`/me/leaderboard?period=${period}`), enabled: customer, staleTime: 30000, refetchInterval: 60000 });
  const labels = { week: t("Tuần"), month: t("Tháng"), all: t("Toàn bộ") };
  function change(next: Period, byKeyboard: boolean) {
    setKeyboard(byKeyboard);
    const params = new URLSearchParams(search.toString());
    params.set("period", next);
    // Next's native history integration updates useSearchParams without a route fetch.
    window.history.pushState(null, "", "/top?" + params.toString());
  }
  function shortDate(value: string) {
    return new Date(value).toLocaleDateString(language === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" });
  }
  const data = board.data;
  const items = data?.items || [];
  const remainingHours = data?.endsAt && now !== null ? Math.max(0, Math.ceil((new Date(data.endsAt).getTime() - now) / 3600000)) : null;
  return <div className="top-screen stack" data-keyboard={keyboard ? "true" : "false"}>
    <section className="top-intro">
      <div className="top-intro-icon" aria-hidden="true"><Trophy size={28} /></div>
      <div><p className="top-eyebrow">{t("TÍCH LŨY HÔM NAY, BỨT PHÁ NGÀY MAI")}</p><h2>{t("Một cuộc đua. Ngàn bước tích lũy.")}</h2><p>{t("Từng đơn được duyệt đều góp vào hành trình của bạn.")}</p></div>
      <span className="top-unit">{t("1 Xu = 1 đồng")}</span>
    </section>
    <div className="top-toolbar">
      <div className="top-tabs" role="tablist" aria-label={t("Kỳ đua")}>
        {periods.map((value, index) => <button key={value} id={`top-tab-${value}`} ref={element => { tabRefs.current[index] = element; }} role="tab" aria-controls="top-results" aria-selected={period === value} tabIndex={period === value ? 0 : -1} onClick={event => change(value, event.detail === 0)} onKeyDown={event => {
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % periods.length;
          else if (event.key === "ArrowLeft") next = (index + periods.length - 1) % periods.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = periods.length - 1;
          else return;
          event.preventDefault(); change(periods[next], true); tabRefs.current[next]?.focus();
        }}>{labels[value]}</button>)}
      </div>
      {data && <div className="top-period-info"><span>{data.startsAt && data.endsAt ? `${shortDate(data.startsAt)} – ${shortDate(new Date(new Date(data.endsAt).getTime() - 1).toISOString())}` : t("Từ những đơn đầu tiên")}</span>{remainingHours !== null && <span className="top-countdown"><Clock3 size={14} />{remainingHours > 24 ? `${t("Còn")} ${Math.ceil(remainingHours / 24)} ${t("ngày")}` : `${t("Còn")} ${remainingHours} ${t("giờ")}`}</span>}</div>}
    </div>
    <div id="top-results" role="tabpanel" aria-labelledby={`top-tab-${period}`} className="stack top-results" key={period}>
      {board.isPending ? <TopSkeleton /> : board.error && !data ? <Retry error={board.error} retry={() => board.refetch()} /> : data ? <>
        {board.error && <Retry error={board.error} retry={() => board.refetch()} />}
        <section className="top-celebration" aria-labelledby="top-podium-title">
          <div className="top-section-head"><div><p className="top-eyebrow"><Sparkles size={14} />{t("NHỮNG NGƯỜI DẪN ĐẦU")}</p><h2 id="top-podium-title">{t("Bứt phá cùng Hoàn Xu")}</h2></div><span className="top-participants"><Users size={15} />{data.participants} {t("người tích lũy")}</span></div>
          {items.length ? <Podium items={items} /> : <div className="top-empty"><Trophy size={44} /><h3>{t("Cuộc đua đang chờ người mở màn")}</h3><p>{t("Chưa có Hoàn Xu được duyệt trong kỳ này. Vị trí đầu tiên đang chờ bạn.")}</p></div>}
        </section>
        <Personal me={me} position={position.data} pending={sessionPending || (customer && position.isPending)} error={position.error} retry={() => position.refetch()} />
        {items.length > 0 && <><TopChart items={items} /><Ranking items={items} userId={customer ? me.id : undefined} /></>}
        <footer className="top-rules"><div><Trophy size={16} /><b>{t("Cách tính cuộc đua")}</b></div><p>{t("Hoàn Xu là tiền hoàn từ đơn đã duyệt, tính vào kỳ có ngày duyệt. Rút tiền không làm giảm tích lũy. Điều chỉnh tiền hoàn sẽ cập nhật kỳ duyệt ban đầu.")}</p><p>{t("Xếp hạng theo Xu giảm dần, rồi số đơn được duyệt; nếu vẫn bằng nhau, thứ tự theo mã thành viên. Tuần bắt đầu thứ Hai, tháng bắt đầu ngày 1 theo giờ Việt Nam. Xu điểm danh không tính vào cuộc đua.")}</p><p>{t("Cập nhật lúc")} {new Date(data.asOf).toLocaleString(language === "en" ? "en-GB" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })} · {t("Tự cập nhật mỗi phút")}</p></footer>
      </> : null}
    </div>
  </div>;
}
