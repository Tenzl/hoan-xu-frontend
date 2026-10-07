"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Crown, Sparkles, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { GiftImage } from "./gift-details";
import { Card } from "./ui";

export type WeeklyCampaign = components["schemas"]["WeeklyPrizeCampaign"];
export type WeeklyAward = components["schemas"]["WeeklyPrizeAward"];
export type WeeklyPreview = components["schemas"]["WeeklyPrizePreview"];
export function weekLabel(start: string, end: string, language: string) {
  const options: Intl.DateTimeFormatOptions = { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" };
  const format = (v: number) => new Date(v).toLocaleDateString(language === "en" ? "en-GB" : "vi-VN", options);
  return `${format(Date.parse(start))} – ${format(Date.parse(end) - 1)}`;
}
export function WeeklyPrizeBanner({ detailed = false }: { detailed?: boolean }) {
  const { t, language } = useI18n();
  const query = useQuery<WeeklyCampaign | null>({ queryKey: ["/leaderboard-prizes/current"], queryFn: ({ signal }) => api("/leaderboard-prizes/current", "GET", undefined, undefined, signal), staleTime: 30000, refetchInterval: 60000 });
  const c = query.data;
  // Also check the clock when cached data crosses a week boundary.
  if (!c || c.status !== "active" || Date.parse(c.weekStart) > Date.now() || Date.parse(c.weekEnd) <= Date.now()) return null;
  return <section className={`weekly-banner${detailed ? " weekly-banner-detail" : ""}`} aria-label={t("Thưởng Top 5 tuần")}>
    <div className="weekly-banner-confetti" aria-hidden="true"><Sparkles /><span /><span /><span /></div>
    <div className="weekly-banner-copy">
      <p className="weekly-banner-kicker"><Trophy size={16} aria-hidden="true" />{t("CUỘC ĐUA TUẦN NÀY")}</p>
      <h2>{t(c.title)}</h2><p className="weekly-banner-intro">{t(c.description)}</p>
      <p className="weekly-banner-time">{weekLabel(c.weekStart, c.weekEnd, language)} · GMT+7</p>
      <Link className="btn weekly-banner-cta" href="/top?period=week">{t("Xem cuộc đua")}<ArrowUpRight size={18} aria-hidden="true" /></Link>
    </div>
    <div className="weekly-banner-prize">
      <strong className="weekly-banner-number" aria-label="Top 5"><span>TOP</span>5</strong>
      <div className="weekly-banner-gift"><GiftImage src={c.gift.imageUrl} name={c.gift.name} /><div><h3>{c.gift.name}</h3><p>{t("Mỗi người một phần")}</p><span className="weekly-banner-free">{t("Không trừ Xu")}</span></div></div>
    </div>
    {detailed && <p className="weekly-banner-rules">{t("Cùng một bảng xếp hạng cho người dùng cũ và mới. Top 5 nhận quà khi admin chốt sau khi tuần kết thúc; Xu từ đơn được duyệt quyết định thứ hạng.")}</p>}
  </section>;
}
export function CustomerRank({ rank }: { rank?: number | null }) {
  return rank ? <span className={`customer-rank${rank <= 5 ? " customer-rank-prize" : ""}`}>{rank <= 5 && <Crown size={13} aria-hidden="true" />}#{rank}</span> : <span className="mute">—</span>;
}
function LeaderCard({ period }: { period: "week" | "month" }) {
  const { t, language } = useI18n();
  const q = useQuery<components["schemas"]["Leaderboard"]>({ queryKey: ["leaderboards", period, "admin"], queryFn: ({ signal }) => api(`/leaderboards?period=${period}`, "GET", undefined, undefined, signal), refetchInterval: 60000 });
  const leader = q.data?.items[0];
  return <Card><div className="row wrap"><span className="customer-leader-icon"><Trophy size={22} aria-hidden="true" /></span><div><p className="small mute">{period === "week" ? t("Dẫn đầu tuần") : t("Dẫn đầu tháng")}</p>
    {q.isPending ? <p role="status">{t("Đang tải…")}</p> : q.error ? <button className="btn sm ghost" onClick={() => void q.refetch()}>{t("Thử lại")}</button> : leader ? <><h3>{leader.name}</h3><p><b>{leader.xu.toLocaleString(language === "en" ? "en-US" : "vi-VN")} Xu</b> · {leader.orders} {t("đơn được duyệt")}</p></> : <p>{t("Chưa có hạng")}</p>}
  </div></div></Card>;
}
export function CustomerLeaders() { return <div className="customer-leaders"><LeaderCard period="week" /><LeaderCard period="month" /></div>; }
export function MyWeeklyAwards({ userId }: { userId: string }) {
  const { t, language } = useI18n();
  const q = useQuery<WeeklyAward[]>({ queryKey: ["/me/leaderboard-awards", userId], queryFn: ({ signal }) => api("/me/leaderboard-awards", "GET", undefined, undefined, signal), refetchInterval: 60000 });
  return <Card title={t("Quà Top tuần của bạn")}>
    {q.isPending ? <p role="status">{t("Đang tải…")}</p> : q.error ? <div role="alert"><p className="err">{t(q.error.message)}</p><button className="btn sm ghost" onClick={() => void q.refetch()}>{t("Thử lại")}</button></div> : !q.data?.length ? <p className="mute">{t("Khi được chốt vào Top 5 tuần, phần thưởng của bạn sẽ xuất hiện ở đây.")}</p> : <ul className="weekly-awards">{q.data.map(a => <li key={a.id}>
      <GiftImage src={a.gift.imageUrl} name={a.gift.name} /><div><h3>{a.gift.name}</h3><p className="small mute">{weekLabel(a.weekStart, a.weekEnd, language)} · #{a.rank}</p><span className="pill">{a.status === "pending" ? t("Chờ trao") : t("Đã trao")}</span>{a.deliveryNote && <p className="weekly-delivery-note">{a.deliveryNote}</p>}</div>
    </li>)}</ul>}
  </Card>;
}
