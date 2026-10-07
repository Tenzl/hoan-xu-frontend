"use client";
import { money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import Link from "next/link";
import { Card } from "../ui";
import type { AdminViewProps } from "./types";
export function AdminOverview({ data }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <div className="grid4">
          {[
            [t("Hoa hồng đã duyệt"), "commission"],
            [t("Hoàn cho khách"), "cashback"],
            [t("Giữ lại"), "retained"],
            [t("Hoa hồng chờ đối soát"), "pendingCommission"],
        ].map(([title, key]) => (<div className="card stat" key={key}>
              <span className="small mute">{t(title)}</span>
              <b className="num">{money(data.data?.[key])}</b>
            </div>))}
        </div>
        <Card title={t("Việc cần xử lý")}>
          <ul className="list">
            {[
            [t("Đơn chờ đối soát"), "pendingOrders", "/admin/orders"],
            [
                t("Yêu cầu rút tiền"),
                "pendingWithdrawals",
                "/admin/withdrawals",
            ],
            [t("Yêu cầu đổi quà"), "pendingGifts", "/admin/gifts"],
        ].map(([label, key, href]) => (<li key={key}>
                <div className="grow">
                  <b>{data.data?.[key] || 0}</b> {t(label)}
                </div>
                <Link className="btn sm ghost" href={href}>
                  {t("Xử lý")}
                </Link>
              </li>))}
          </ul>
        </Card>
        <div className="grid3">
          {[
            [t("Người dùng"), "users"],
            [t("Link đã tạo"), "links"],
            [t("Đã chuyển khoản"), "paid"],
        ].map(([title, key]) => (<div className="card stat" key={key}>
              <span className="small mute">{t(title)}</span>
              <b className="num">
                {key === "paid"
                ? money(data.data?.[key])
                : data.data?.[key] || 0}
              </b>
            </div>))}
        </div>
      </div>);
}
