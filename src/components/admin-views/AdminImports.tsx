"use client";
import { date } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Card, Status, Table } from "../ui";
import type { AdminViewProps } from "./types";
export function AdminImports({ ctx, rows, rowData, selected, setSelected, mapping, setMapping, dialog, pager }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <Card title={t("Nhập báo cáo CSV")}>
          <p className="mute login-copy">
            {t("UTF-8, tối đa 10 MB/50.000 dòng. Hoa hồng và giá trị là số nguyên VND. Xem file mẫu trong database/seeds.")}
          </p>
          <label className="field">
            {t("Mapping cột (JSON, bỏ trống dùng tên chuẩn)")}
            <textarea className="inp" value={mapping} onChange={(e) => setMapping(e.target.value)}/>
          </label>
          <input className="inp" aria-label={t("Chọn báo cáo CSV")} type="file" accept=".csv" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f)
                return;
            const form = new FormData();
            form.set("file", f);
            form.set("mapping", mapping);
            try {
                const b = await ctx.act("/admin/order-imports", "POST", form);
                setSelected(b.id);
            }
            catch { }
            e.target.value = "";
        }}/>
        </Card>
        <Card title={t("Batch đối soát")}>
          <Table rows={rowData} columns={[
            { label: t("Ngày"), render: (r) => date(r.createdAt) },
            { label: "File", render: (r) => r.filename },
            {
                label: t("Trạng thái"),
                render: (r) => <Status value={r.status}/>,
            },
            {
                label: t("Dòng"),
                render: (r) => Object.entries(r.counts || {})
                    .map(([k, v]) => k + ": " + v)
                    .join(" · "),
            },
            {
                label: "",
                render: (r) => (<div className="row wrap">
                    <button className="btn sm ghost" onClick={() => setSelected(r.id)}>
                      Xem preview
                    </button>
                    {r.status === "preview" && (<button className="btn sm" onClick={async () => {
                            try {
                                await ctx.act("/admin/order-imports/" + r.id + "/commit");
                            }
                            catch { }
                        }}>
                        Commit
                      </button>)}
                    {r.status === "failed" && (<button className="btn sm ghost" onClick={async () => {
                            try {
                                await ctx.act("/admin/order-imports/" + r.id + "/retry");
                            }
                            catch { }
                        }}>
                        {t("Thử lại")}
                      </button>)}
                  </div>),
            },
        ]}/>
          {pager}
        </Card>
        {selected && (<Card title={t("Preview dòng CSV")}>
            {rows.error ? (<p className="err">{t(rows.error.message)}</p>) : (<Table rows={rows.data || []} columns={[
                    { label: t("Dòng"), render: (r) => r.number },
                    {
                        label: t("Trạng thái"),
                        render: (r) => <Status value={r.status}/>,
                    },
                    {
                        label: t("Đơn/sản phẩm"),
                        render: (r) => (<>
                        {r.payload?.orderId}/{r.payload?.lineId}
                        <p>{r.payload?.productName}</p>
                      </>),
                    },
                    { label: "Tracking", render: (r) => r.payload?.trackingCode },
                    {
                        label: t("Nguồn sàn"),
                        render: (r) => r.payload?.status,
                    },
                    { label: t("Lỗi"), render: (r) => r.error },
                    {
                        label: "",
                        render: (r) => r.status === "unmatched" && (<button className="btn sm ghost" onClick={() => dialog(t("Khớp tracking từ bằng chứng"), [
                                {
                                    name: "trackingCode",
                                    label: t("Tracking đúng có trong hệ thống"),
                                },
                                {
                                    name: "reason",
                                    label: t("Bằng chứng/lý do"),
                                },
                            ], "/admin/order-imports/" +
                                selected +
                                "/rows/" +
                                r.number +
                                "/resolve")}>
                          {t("Khớp")}
                        </button>),
                    },
                ]}/>)}
            <p className="small mute">
              {t("Đơn đã nhập vẫn chờ admin duyệt. Dòng adjustment cần kiểm tra ở Đối soát đơn.")}
            </p>
          </Card>)}
      </div>);
}
