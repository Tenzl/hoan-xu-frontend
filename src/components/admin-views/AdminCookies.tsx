"use client";
import { ShopeeSettings } from "../shopee-settings";
import { ShopeeLoginPanel } from './ShopeeLoginPanel';
import type { AdminViewProps } from "./types";
export function AdminCookies({ ctx, data }: AdminViewProps) {
    return <div className="stack"><ShopeeLoginPanel ctx={ctx} publisher={data.data?.publisher || ""} status={data.data?.browser} error={data.error} localAvailable={ctx.me?.role === "admin" && data.data?.localAvailable === true} remoteAvailable={ctx.me?.role === "admin" && data.data?.remoteAvailable === true}/><ShopeeSettings ctx={ctx}/></div>;
}
