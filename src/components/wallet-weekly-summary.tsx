"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import type { components } from "@/lib/api-schema";
import { useI18n } from "@/lib/i18n";
import { GiftImage } from "./gift-details";
import { weekLabel, type WeeklyCampaign, type WeeklyAward } from "./weekly-prizes";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

type Position = components["schemas"]["LeaderboardPosition"];

export function WalletWeeklySummary({ userId }: { userId: string }) {
  const { t, language } = useI18n();
  const position = useQuery<Position>({ queryKey: ["my-leaderboard", "week", userId], queryFn: ({ signal }) => api("/me/leaderboard?period=week", "GET", undefined, undefined, signal), staleTime: 30000, refetchInterval: 60000 });
  const campaign = useQuery<WeeklyCampaign | null>({ queryKey: ["/leaderboard-prizes/current"], queryFn: ({ signal }) => api("/leaderboard-prizes/current", "GET", undefined, undefined, signal), staleTime: 30000, refetchInterval: 60000 });
  const awards = useQuery<WeeklyAward[]>({ queryKey: ["/me/leaderboard-awards", userId], queryFn: ({ signal }) => api("/me/leaderboard-awards", "GET", undefined, undefined, signal), staleTime: 30000, refetchInterval: 60000 });
  const number = (value: number) => value.toLocaleString(language === "en" ? "en-US" : "vi-VN");
  const current = campaign.data;
  const activeCampaign = current?.status === "active" && Date.parse(current.weekStart) <= Date.now() && Date.parse(current.weekEnd) > Date.now() ? current : null;
  const latestAward = [...(awards.data || [])].sort((a, b) => Date.parse(b.weekStart) - Date.parse(a.weekStart))[0];
  const p = position.data;

  return <section className="wallet-weekly" aria-label={t("Hạng tuần này")}>
    <div className="wallet-weekly-heading"><h3><Trophy size={16} aria-hidden="true" />{t("Hạng tuần này")}</h3><Link href="/top?period=week" aria-label={t("Xem bảng xếp hạng tuần")}><ArrowUpRight size={16} aria-hidden="true" /></Link></div>
    <div className="wallet-weekly-position">
      {position.isPending ? <div role="status" aria-label={t("Đang tải hạng tuần…")} className="wallet-weekly-loading"><Skeleton /><Skeleton /></div>
        : position.isError ? <div className="wallet-weekly-error" role="alert"><p>{t("Chưa tải được hạng tuần.")}</p><Button variant="ghost" size="sm" disabled={position.isFetching} onClick={() => void position.refetch()}>{t("Thử lại")}</Button></div>
        : <><div className="wallet-weekly-rank"><strong className="num">{p?.rank ? `#${number(p.rank)}` : "—"}</strong><div><span>{p?.rank ? t("Vị trí hiện tại") : t("Chưa có hạng")}</span><p><b className="num">{number(Number(p?.xu || 0))} Xu</b> · {number(Number(p?.orders || 0))} {t("đơn được duyệt")}</p></div></div>
          {p?.startsAt && p?.endsAt && <p className="wallet-weekly-period">{weekLabel(p.startsAt, p.endsAt, language)} · GMT+7</p>}
        </>}
    </div>
    {campaign.isPending || awards.isPending ? <div className="wallet-prize-loading" role="status" aria-label={t("Đang tải phần thưởng…")}><Skeleton /></div> : <>
      {activeCampaign && <div className="wallet-weekly-prize"><GiftImage src={activeCampaign.gift.imageUrl} name={activeCampaign.gift.name} /><div><span>{t("Quà cho Top 5 tuần này")}</span><strong>{activeCampaign.gift.name}</strong><p>{t("Chốt thưởng sau khi tuần kết thúc.")}</p></div></div>}
      {latestAward && <div className="wallet-earned-prize"><div className="wallet-earned-heading"><span>{t("Phần thưởng của bạn")}</span><Badge variant={latestAward.status === "pending" ? "secondary" : "default"}>{latestAward.status === "pending" ? t("Chờ trao") : t("Đã trao")}</Badge></div><div className="wallet-weekly-prize"><GiftImage src={latestAward.gift.imageUrl} name={latestAward.gift.name} /><div><strong>{latestAward.gift.name}</strong><p>{weekLabel(latestAward.weekStart, latestAward.weekEnd, language)} · #{latestAward.rank}</p></div></div>{latestAward.deliveryNote && <p className="wallet-award-note">{latestAward.deliveryNote}</p>}<Link className="wallet-awards-link" href="/top?period=week">{t("Xem phần thưởng của bạn")}<ArrowUpRight size={13} aria-hidden="true" /></Link></div>}
    </>}
    {(campaign.isError || awards.isError) && <div className="wallet-weekly-error" role="alert"><p>{t("Chưa tải được phần thưởng.")}</p><Button variant="ghost" size="sm" disabled={campaign.isFetching || awards.isFetching} onClick={() => { if (campaign.isError) void campaign.refetch(); if (awards.isError) void awards.refetch(); }}>{t("Thử lại")}</Button></div>}
  </section>;
}
