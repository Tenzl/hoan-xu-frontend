"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { ShopeeSettings } from "../shopee-settings";
import { ShopeeLoginPanel } from "./ShopeeLoginPanel";
import { AdminTabs } from "./admin-ui";
import type { AdminViewProps } from "./types";
export function AdminCookies({ ctx, data }: AdminViewProps) {
  const { t } = useI18n();
  const [tab, setTab] = useState("session");
  return <div className="stack">
    <AdminTabs label={t("Kết nối Shopee")} value={tab} onChange={setTab} options={[{value:"session",label:t("Phiên đăng nhập")},{value:"config",label:t("Cấu hình kết nối")}]} />
    <div hidden={tab !== "session"}><ShopeeLoginPanel ctx={ctx} publisher={data.data?.publisher || ""} status={data.data?.browser} error={data.error} localAvailable={ctx.me?.role === "admin" && data.data?.localAvailable === true} remoteAvailable={ctx.me?.role === "admin" && data.data?.remoteAvailable === true}/></div>
    <div hidden={tab !== "config"}><ShopeeSettings ctx={ctx}/></div>
  </div>;
}
