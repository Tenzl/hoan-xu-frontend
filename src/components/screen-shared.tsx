"use client";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Mascot } from "./mascot";
import { Card, type Data } from "./ui";
export function useData<T = Data[]>(path: string, enabled = true) {
    return useQuery<T>({
        queryKey: [path],
        queryFn: () => api<T>(path),
        enabled,
        refetchInterval: path.includes("order-imports") ? 5000 : false,
    });
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
        <p className="small mute">{t("Bấm Đăng nhập ở góc trên bên phải để tiếp tục.")}</p>
      </div>
    </Card>);
}
