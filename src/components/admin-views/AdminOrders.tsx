"use client";
import { money } from "@/lib/api";
import { tierName } from "@/lib/cashback";
import { useI18n } from "@/lib/i18n";
import { Card, Form, Status, Table } from "../ui";
import { channels } from "./constants";
import type { AdminViewProps } from "./types";
export function AdminOrders({ ctx, rowData, setPage, tab, setTab, dialog, event, pager, common }: AdminViewProps) {
    const { t } = useI18n();
    return (<div className="stack">
        <div className="tabs">
          {["pending", "approved", "rejected", ""].map((status) => (<button key={status} aria-pressed={status === tab} onClick={() => {
                setTab(status);
                setPage(1);
            }}>
              {status ? <Status value={status}/> : t("Tất cả")}
            </button>))}
        </div>
        <Card>
          <Table rows={rowData} columns={[
            ...common,
            {
                label: t("Sản phẩm"),
                render: (r) => (<>
                    {r.productName}
                    <p className="small mute">
                      {r.channel} · {r.externalId}/{r.lineId}
                    </p>
                  </>),
            },
            { label: t("Giá trị"), render: (r) => money(r.value) },
            { label: t("Hoa hồng"), render: (r) => money(r.commission) },
            { label: t("Tỷ lệ đã chọn"), render: (r) => <>{r.sharePercent == null ? "—" : `${r.sharePercent}%`}<p className="small mute">{t(tierName(r.tierCode))}</p></> },
            {
                label: t("Hoàn khách"),
                render: (r) => money(r.cashback),
            },
            {
                label: t("Trạng thái"),
                render: (r) => <Status value={r.status}/>,
            },
            {
                label: t("Nguồn sàn"),
                render: (r) => <Status value={r.sourceStatus}/>,
            },
            {
                label: t("Thao tác"),
                render: (r) => (<div className="row wrap">
                    {r.status === "pending" ? (<>
                        <button className="btn sm" disabled={r.sourceStatus !== "approved"} title={r.sourceStatus !== "approved"
                            ? t("Chờ sàn duyệt trong báo cáo")
                            : undefined} onClick={() => event("/admin/orders/" + r.id + "/events", "approved")}>
                          {t("Duyệt")}
                        </button>
                        <button className="btn sm ghost" onClick={() => dialog(t("Từ chối đơn"), [{ name: "reason", label: t("Lý do") }], "/admin/orders/" + r.id + "/events", {}, "POST", { action: "rejected" })}>
                          {t("Hủy")}
                        </button>
                      </>) : r.status === "approved" ? (<button className="btn sm ghost" onClick={() => dialog(t("Điều chỉnh hoa hồng"), [
                            {
                                name: "commission",
                                label: t("Hoa hồng thực nhận mới"),
                                type: "number",
                            },
                            { name: "reason", label: t("Lý do") },
                        ], "/admin/orders/" + r.id + "/events", { commission: r.commission }, "POST", { action: "adjustment" })}>
                        {t("Điều chỉnh")}
                      </button>) : r.status === "rejected" && r.internallyRejected && r.sourceStatus !== "rejected" ? (<button className="btn sm ghost" onClick={() => dialog(t("Mở lại đơn"), [{ name: "reason", label: t("Lý do") }], "/admin/orders/" + r.id + "/events", {}, "POST", { action: "reopened" })}>{t("Mở lại đơn")}</button>) : null}
                  </div>),
            },
        ]}/>
          {pager}
        </Card>
        <Card title={t("Thêm đơn từ báo cáo sàn")}>
          <p className="mute login-copy">
            {t("Dùng đủ Sub_id1–5 và thời điểm đặt đơn từ báo cáo Shopee gốc. Đơn nhập tay vẫn chờ duyệt.")}
          </p>
          <Form fields={[
            { name: "subId1", label: "Sub_id1" },
            { name: "subId2", label: "Sub_id2", placeholder: "hoanxu" },
            { name: "subId3", label: "Sub_id3" },
            { name: "subId4", label: "Sub_id4", placeholder: "0p63" },
            { name: "subId5", label: "Sub_id5" },
            { name: "channel", label: t("Kênh"), options: channels.slice(0, 1) },
            { name: "publisher", label: "Publisher" },
            {
                name: "externalId",
                label: t("Mã đơn nguồn"),
            },
            { name: "conversionId", label: "Conversion id" },
            { name: "shopId", label: "Shop id" },
            { name: "itemId", label: "Item id" },
            { name: "modelId", label: "Model id" },
            { name: "promotionId", label: "Promotion id" },
            { name: "orderedAt", label: "Order Time (GMT+7)", placeholder: "2026-10-06T12:34:56+07:00" },
            { name: "productName", label: t("Sản phẩm") },
            {
                name: "value",
                label: t("Giá trị đơn"),
                type: "number",
            },
            {
                name: "commission",
                label: t("Hoa hồng thực nhận"),
                type: "number",
            },
            {
                name: "evidence",
                label: t("Nguồn/bằng chứng"),
                type: "textarea",
            },
        ]} submit={t("Thêm đơn")} onSubmit={async (v) => {
            try {
                const { subId1, subId2, subId3, subId4, subId5, ...order } = v;
                await ctx.act("/admin/orders", "POST", { ...order, trackingCode: subId3, subIds: [subId1, subId2, subId3, subId4, subId5] });
            }
            catch { }
        }}/>
        </Card>
      </div>);
}
