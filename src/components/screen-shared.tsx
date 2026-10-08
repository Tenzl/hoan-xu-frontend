"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useCashbackFlow } from "./cashback-flow";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Mascot } from "./mascot";
import { Card, type Data } from "./ui";
export function useData<T = Data[]>(path: string, enabled = true, scope?: string) {
    const query = useQuery<T>({
        queryKey: [path,scope],
        queryFn: () => api<T>(path),
        enabled,
        refetchInterval: path === "/me/dashboard" ? 60000 : path.includes("order-imports") ? 5000 : false,
    });
    const ends=(query.data as {membership?:{periodEndsAt?:string}}|undefined)?.membership?.periodEndsAt;
    useEffect(()=>{
      if(!enabled || path!=="/me/dashboard" || !ends)return;
      const boundary=Date.parse(ends);if(!Number.isFinite(boundary)||boundary<=Date.now())return;
      let timer:ReturnType<typeof setTimeout>;
      const schedule=()=>{timer=setTimeout(()=>{if(Date.now()>=boundary)void query.refetch();else schedule();},Math.min(86400000,Math.max(1,boundary-Date.now()+50)));};
      schedule();return()=>clearTimeout(timer);
    },[enabled,path,scope,ends,query.refetch]);
    return query;
}
export function QueryState({ q, children, }: {
    q: {
        isPending: boolean;
        error: Error | null;
        refetch: () => unknown;
    };
    children: React.ReactNode;
}) {
    const { t } = useI18n();
    if (q.isPending)
        return (<Card>
        <p role="status" className="mute">
          {t("Đang tải dữ liệu…")}
        </p>
      </Card>);
    if (q.error)
        return (<Card>
        <p className="err" role="alert">
          {t(q.error.message)}
        </p>
        <button className="btn sm ghost" onClick={() => q.refetch()}>
          {t("Thử lại")}
        </button>
      </Card>);
    return <>{children}</>;
}
export function LoginGate({ internal = false }: {
    internal?: boolean;
}) {
    const { t } = useI18n();
    const flow = useCashbackFlow();
    return (<Card>
      <div className="empty">
        <Mascot size={90}/>
        <h3>
          {internal
            ? t("Cần tài khoản nội bộ")
            : t("Đăng nhập để xem dữ liệu cá nhân")}
        </h3>
        <p>
          {internal
            ? t("Tài khoản do quản trị viên cấp.")
            : t("Dùng Google để tạo link, điểm danh và theo dõi hoàn tiền.")}
        </p>
        <Link className="btn" href="/login" onClick={flow.prepareLogin}>{t(internal ? "Đăng nhập" : "Tiếp tục với Google")}</Link>
      </div>
    </Card>);
}
