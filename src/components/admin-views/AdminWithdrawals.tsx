"use client";
import { money } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Status, Table } from "../ui";
import { EvidenceUpload } from './EvidenceUpload';
import type { AdminViewProps } from "./types";
export function AdminWithdrawals({ ctx, rowData, dialog, event, pager, common }: AdminViewProps) {
    const { t } = useI18n();
    return (<Card>
        <Table rows={rowData} columns={[
            ...common,
            {
                label: t("Ngân hàng"),
                render: (r) => (<>
                  {r.bank}
                  <p className="num small">
                    {r.account} · {r.holder}
                  </p>
                </>),
            },
            { label: t("Số tiền"), render: (r) => money(r.amount) },
            {
                label: t("Trạng thái"),
                render: (r) => <Status value={r.status}/>,
            },
            {
                label: t("Thao tác"),
                render: (r) => (<div className="row wrap">
                  {r.status === "pending" && (<button className="btn sm" onClick={() => event("/admin/withdrawals/" + r.id + "/events", "processing")}>
                      {t("Nhận xử lý")}
                    </button>)}
                  {r.status === "processing" &&
                        r.processorId === ctx.me?.id && (<button className="btn sm" onClick={() => ctx.dialog({
                            title: t("Xác nhận chuyển khoản"),
                            fields: [
                                {
                                    name: "bankReference",
                                    label: t("Mã giao dịch ngân hàng"),
                                },
                                {
                                    name: "evidenceId",
                                    label: t("ID bằng chứng (tải file ở dưới trước)"),
                                },
                            ],
                            submit: t("Đã chuyển khoản"),
                            action: async (v) => {
                                await ctx.act("/admin/withdrawals/" + r.id + "/events", "POST", { ...v, action: "paid", reason: "" });
                                ctx.dialog(null);
                            },
                        })}>
                        {t("Đã chuyển")}
                      </button>)}
                  {["pending", "processing"].includes(r.status) && (<button className="btn sm ghost" onClick={() => dialog(t("Từ chối rút tiền"), [{ name: "reason", label: t("Lý do") }], "/admin/withdrawals/" + r.id + "/events", {}, "POST", { action: "rejected" })}>
                      {t("Từ chối")}
                    </button>)}
                  {r.evidenceId && (<a className="btn sm ghost" href={"/api/v1/private-files/" + r.evidenceId}>
                      {t("Bằng chứng")}
                    </a>)}
                </div>),
            },
        ]}/>
        {pager}
        <EvidenceUpload ctx={ctx}/>
      </Card>);
}
