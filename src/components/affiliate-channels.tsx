"use client";
import { useI18n } from "@/lib/i18n";
import { useData } from "./screen-shared";
export function AffiliateChannels() {
  const { t } = useI18n();
  const query = useData("/affiliate-channels");
  return <div className="affiliate-channels" aria-label={t("Các sàn liên kết")}>
    <span className="small mute">{t("Sàn liên kết")}</span>
    {query.isPending ? <span role="status">{t("Đang tải…")}</span> : query.isError ? <button type="button" className="btn sm ghost" onClick={() => void query.refetch()}>{t("Thử lại")}</button> : (query.data || []).map(channel => <span key={channel.id} className={"affiliate-channel" + (channel.status === "available" ? " is-available" : " is-unavailable")}><span>{channel.name}</span><small>{t(channel.status === "available" ? "Đang hoạt động" : "Chưa mở")}</small></span>)}
  </div>;
}
