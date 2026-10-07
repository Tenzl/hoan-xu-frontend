"use client";
import { date, money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Table } from "../ui";
import type { AdminViewProps } from "./types";
export function AdminAudit({ ledger, rowData, pager }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <Card title={t("Kiểm tra sổ ví")}>
          {ledger.error ? (<p className="err">{t(ledger.error.message)}</p>) : ledger.isPending ? (<p>{t("Đang kiểm tra…")}</p>) : ledger.data?.length ? (<Table rows={ledger.data} columns={[
                { label: t("Tài khoản"), render: (r) => r.accountId },
                {
                    label: t("Số dư"),
                    render: (r) => money(r.balance),
                },
                {
                    label: t("Theo ledger"),
                    render: (r) => money(r.ledgerBalance),
                },
            ]}/>) : (<p className="pill ok">{t("Số dư khớp với sổ giao dịch")}</p>)}
        </Card>
        <Card title={t("Lịch sử quản trị")}>
          <Table rows={rowData} columns={[
            { label: t("Ngày"), render: (r) => date(r.createdAt) },
            { label: "Actor", render: (r) => r.actorId },
            { label: t("Thao tác"), render: (r) => r.action },
            {
                label: t("Đối tượng"),
                render: (r) => r.resource,
            },
            {
                label: t("Chi tiết"),
                render: (r) => (<span className="small">{JSON.stringify(r.payload)}</span>),
            },
        ]}/>
          {pager}
        </Card>
      </div>);
}
