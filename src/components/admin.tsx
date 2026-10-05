"use client";
import { useI18n } from "@/lib/i18n";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, date, money } from "@/lib/api";
import type { AppContext } from "./hoanxu";
import { CashbackPolicy } from "./cashback-policy";
import { RemoteBrowserAccess } from "./remote-browser-access";
import { tierName } from "@/lib/cashback";
import { Card, Empty, Form, Status, Table, type Data, type Field } from "./ui";
const channels = [
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "tiki", label: "Tiki" },
];
const permissionNames = [
  "orders",
  "withdrawals",
  "users",
  "gifts",
  "community",
  "notifications",
  "settings",
  "audit",
];
export function AdminScreen({ path, ctx }: { path: string; ctx: AppContext }) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("pending");
  const [selected, setSelected] = useState("");
  const [mapping, setMapping] = useState("{}");
  const endpoint =
    path === "/admin"
      ? "/admin/dashboard"
      : path === "/admin/orders"
        ? "/admin/orders?status=" + tab + "&page=" + page
        : path === "/admin/imports"
          ? "/admin/order-imports?page=" + page
          : path === "/admin/withdrawals"
            ? "/admin/withdrawals?page=" + page
            : path === "/admin/users"
              ? "/admin/users?page=" + page
              : path === "/admin/gifts"
                ? "/admin/gift-redemptions?page=" + page
                : path === "/admin/deals"
                  ? "/admin/deals?page=" + page
                  : path === "/admin/notifications"
                    ? "/admin/notifications?page=" + page
                    : path === "/admin/settings"
                      ? "/admin/settings"
                      : path === "/admin/cookies"
                        ? "/admin/browser"
                        : path === "/admin/accounts"
                          ? "/admin/internal-accounts?page=" + page
                          : "/admin/audit-logs?page=" + page;
  const data = useQuery<any>({
    queryKey: [endpoint],
    queryFn: () => api(endpoint),
    refetchInterval:
      path === "/admin/imports" ? 3000 : path === "/admin/cookies" ? 5000 : false,
  });
  const gifts = useQuery<Data[]>({
    queryKey: ["/admin/gifts"],
    queryFn: () => api("/admin/gifts"),
    enabled: path === "/admin/gifts",
  });
  const channelQ = useQuery<Data[]>({
    queryKey: ["/admin/affiliate-channels"],
    queryFn: () => api("/admin/affiliate-channels"),
    enabled: path === "/admin/settings",
  });
  const rows = useQuery<Data[]>({
    queryKey: ["/admin/order-imports/" + selected + "/rows"],
    queryFn: () =>
      api("/admin/order-imports/" + selected + "/rows?perPage=100"),
    enabled: path === "/admin/imports" && !!selected,
  });
  const ledger = useQuery<Data[]>({
    queryKey: ["/admin/ledger-check"],
    queryFn: () => api("/admin/ledger-check"),
    enabled: path === "/admin/audit",
  });
  const rowData: Data[] = Array.isArray(data.data) ? data.data : [];
  function dialog(
    title: string,
    fields: Field[],
    endpoint: string,
    initial: Data = {},
    method = "POST",
    extra: Data = {},
  ) {
    ctx.dialog({
      title,
      fields,
      initial,
      submit: t("Xác nhận"),
      action: async (v) => {
        await ctx.act(endpoint, method, { ...extra, ...v });
        ctx.dialog(null);
      },
    });
  }
  async function event(endpoint: string, action: string) {
    try {
      await ctx.act(endpoint, "POST", { action, reason: "" });
    } catch {}
  }
  const common = [
    {
      label: t("Ngày"),
      render: (r: Data) => date(r.createdAt || r.orderedAt),
    },
    {
      label: t("Người dùng"),
      render: (r: Data) => (
        <>
          <b>{r.name}</b>
          <p className="small mute">{r.userId}</p>
        </>
      ),
    },
  ];
  if (data.isPending)
    return (
      <Card>
        <p role="status">{t("Đang tải dữ liệu quản trị…")}</p>
      </Card>
    );
  if (data.error)
    return (
      <Card>
        <p className="err" role="alert">
          {t(data.error.message)}
        </p>
        <button className="btn sm ghost" onClick={() => data.refetch()}>
          {t("Thử lại")}
        </button>
      </Card>
    );
  const pager = (
    <div className="row between pager">
      <button
        className="btn sm ghost"
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        {t("← Trước")}
      </button>
      <span className="small mute">
        {t("Trang")} {page}
      </span>
      <button className="btn sm ghost" onClick={() => setPage(page + 1)}>
        {t("Tiếp →")}
      </button>
    </div>
  );
  if (path === "/admin/cookies")
    return <ShopeeLoginPanel ctx={ctx} publisher={data.data?.publisher || ""} status={data.data?.browser} error={data.error} localAvailable={ctx.me?.role === "admin" && data.data?.localAvailable === true} remoteAvailable={ctx.me?.role === "admin" && data.data?.remoteAvailable === true} />;
  if (path === "/admin")
    return (
      <div className="stack">
        <div className="grid4">
          {[
            [t("Hoa hồng đã duyệt"), "commission"],
            [t("Hoàn cho khách"), "cashback"],
            [t("Giữ lại"), "retained"],
            [t("Hoa hồng chờ đối soát"), "pendingCommission"],
          ].map(([title, key]) => (
            <div className="card stat" key={key}>
              <span className="small mute">{t(title)}</span>
              <b className="num">{money(data.data?.[key])}</b>
            </div>
          ))}
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
            ].map(([label, key, href]) => (
              <li key={key}>
                <div className="grow">
                  <b>{data.data?.[key] || 0}</b> {t(label)}
                </div>
                <Link className="btn sm ghost" href={href}>
                  {t("Xử lý")}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <div className="grid3">
          {[
            [t("Người dùng"), "users"],
            [t("Link đã tạo"), "links"],
            [t("Đã chuyển khoản"), "paid"],
          ].map(([title, key]) => (
            <div className="card stat" key={key}>
              <span className="small mute">{t(title)}</span>
              <b className="num">
                {key === "paid"
                  ? money(data.data?.[key])
                  : data.data?.[key] || 0}
              </b>
            </div>
          ))}
        </div>
      </div>
    );
  if (path === "/admin/orders")
    return (
      <div className="stack">
        <div className="tabs">
          {["pending", "approved", "rejected", ""].map((status) => (
            <button
              key={status}
              aria-pressed={status === tab}
              onClick={() => {
                setTab(status);
                setPage(1);
              }}
            >
              {status ? <Status value={status} /> : t("Tất cả")}
            </button>
          ))}
        </div>
        <Card>
          <Table
            rows={rowData}
            columns={[
              ...common,
              {
                label: t("Sản phẩm"),
                render: (r) => (
                  <>
                    {r.productName}
                    <p className="small mute">
                      {r.channel} · {r.externalId}/{r.lineId}
                    </p>
                  </>
                ),
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
                render: (r) => <Status value={r.status} />,
              },
              {
                label: t("Nguồn sàn"),
                render: (r) => <Status value={r.sourceStatus} />,
              },
              {
                label: t("Thao tác"),
                render: (r) => (
                  <div className="row wrap">
                    {r.status === "pending" ? (
                      <>
                        <button
                          className="btn sm"
                          disabled={r.sourceStatus !== "approved"}
                          title={
                            r.sourceStatus !== "approved"
                              ? t("Chờ sàn duyệt trong báo cáo")
                              : undefined
                          }
                          onClick={() =>
                            event(
                              "/admin/orders/" + r.id + "/events",
                              "approved",
                            )
                          }
                        >
                          {t("Duyệt")}
                        </button>
                        <button
                          className="btn sm ghost"
                          onClick={() =>
                            dialog(
                              t("Từ chối đơn"),
                              [{ name: "reason", label: t("Lý do") }],
                              "/admin/orders/" + r.id + "/events",
                              {},
                              "POST",
                              { action: "rejected" },
                            )
                          }
                        >
                          {t("Hủy")}
                        </button>
                      </>
                    ) : r.status === "approved" ? (
                      <button
                        className="btn sm ghost"
                        onClick={() =>
                          dialog(
                            t("Điều chỉnh hoa hồng"),
                            [
                              {
                                name: "commission",
                                label: t("Hoa hồng thực nhận mới"),
                                type: "number",
                              },
                              { name: "reason", label: t("Lý do") },
                            ],
                            "/admin/orders/" + r.id + "/events",
                            { commission: r.commission },
                            "POST",
                            { action: "adjustment" },
                          )
                        }
                      >
                        {t("Điều chỉnh")}
                      </button>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
          {pager}
        </Card>
        <Card title={t("Thêm đơn từ báo cáo sàn")}>
          <p className="mute login-copy">
            {t("Tracking phải có trong hệ thống. Đơn nhập tay vẫn chờ duyệt.")}
          </p>
          <Form
            fields={[
              { name: "trackingCode", label: t("Tracking của link") },
              { name: "channel", label: t("Kênh"), options: channels },
              { name: "publisher", label: "Publisher" },
              {
                name: "externalId",
                label: t("Mã đơn nguồn"),
              },
              { name: "lineId", label: t("Mã dòng đơn") },
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
            ]}
            submit={t("Thêm đơn")}
            onSubmit={async (v) => {
              try {
                await ctx.act("/admin/orders", "POST", v);
              } catch {}
            }}
          />
        </Card>
      </div>
    );
  if (path === "/admin/withdrawals")
    return (
      <Card>
        <Table
          rows={rowData}
          columns={[
            ...common,
            {
              label: t("Ngân hàng"),
              render: (r) => (
                <>
                  {r.bank}
                  <p className="num small">
                    {r.account} · {r.holder}
                  </p>
                </>
              ),
            },
            { label: t("Số tiền"), render: (r) => money(r.amount) },
            {
              label: t("Trạng thái"),
              render: (r) => <Status value={r.status} />,
            },
            {
              label: t("Thao tác"),
              render: (r) => (
                <div className="row wrap">
                  {r.status === "pending" && (
                    <button
                      className="btn sm"
                      onClick={() =>
                        event(
                          "/admin/withdrawals/" + r.id + "/events",
                          "processing",
                        )
                      }
                    >
                      {t("Nhận xử lý")}
                    </button>
                  )}
                  {r.status === "processing" &&
                    r.processorId === ctx.me?.id && (
                      <button
                        className="btn sm"
                        onClick={() =>
                          ctx.dialog({
                            title: t("Xác nhận chuyển khoản"),
                            fields: [
                              {
                                name: "bankReference",
                                label: t("Mã giao dịch ngân hàng"),
                              },
                              {
                                name: "evidenceId",
                                label: t(
                                  "ID bằng chứng (tải file ở dưới trước)",
                                ),
                              },
                            ],
                            submit: t("Đã chuyển khoản"),
                            action: async (v) => {
                              await ctx.act(
                                "/admin/withdrawals/" + r.id + "/events",
                                "POST",
                                { ...v, action: "paid", reason: "" },
                              );
                              ctx.dialog(null);
                            },
                          })
                        }
                      >
                        {t("Đã chuyển")}
                      </button>
                    )}
                  {["pending", "processing"].includes(r.status) && (
                    <button
                      className="btn sm ghost"
                      onClick={() =>
                        dialog(
                          t("Từ chối rút tiền"),
                          [{ name: "reason", label: t("Lý do") }],
                          "/admin/withdrawals/" + r.id + "/events",
                          {},
                          "POST",
                          { action: "rejected" },
                        )
                      }
                    >
                      {t("Từ chối")}
                    </button>
                  )}
                  {r.evidenceId && (
                    <a
                      className="btn sm ghost"
                      href={"/api/v1/private-files/" + r.evidenceId}
                    >
                      {t("Bằng chứng")}
                    </a>
                  )}
                </div>
              ),
            },
          ]}
        />
        {pager}
        <EvidenceUpload ctx={ctx} />
      </Card>
    );
  if (path === "/admin/users")
    return (
      <Card>
        <Table
          rows={rowData}
          columns={[
            {
              label: t("Khách"),
              render: (r) => (
                <>
                  <b>{r.name}</b>
                  <p className="small mute">{r.email}</p>
                </>
              ),
            },
            { label: "Tham gia", render: (r) => date(r.createdAt) },
            {
              label: t("Khả dụng"),
              render: (r) => money(r.available),
            },
            { label: t("Tạm giữ"), render: (r) => money(r.held) },
            { label: t("Giữ Xu đổi quà"), render: (r) => money(r.giftHeld) },
            {
              label: t("Trạng thái"),
              render: (r) => (r.blocked ? t("Đã khóa") : t("Hoạt động")),
            },
            {
              label: "",
              render: (r) => (
                <button
                  className="btn sm ghost"
                  onClick={() =>
                    dialog(
                      r.blocked ? t("Mở khóa khách") : t("Khóa khách"),
                      [{ name: "reason", label: t("Lý do") }],
                      "/admin/users/" + r.id,
                      {},
                      "PATCH",
                      { blocked: !r.blocked },
                    )
                  }
                >
                  {r.blocked ? t("Mở khóa") : t("Khóa")}
                </button>
              ),
            },
          ]}
        />
        {pager}
      </Card>
    );
  if (path === "/admin/gifts")
    return (
      <div className="stack">
        <Card title={t("Yêu cầu đổi quà")}>
          <Table
            rows={rowData}
            columns={[
              ...common,
              { label: t("Quà"), render: (r) => r.giftName },
              { label: t("Xu"), render: (r) => r.costXu },
              {
                label: t("Trạng thái"),
                render: (r) => <Status value={r.status} />,
              },
              {
                label: "",
                render: (r) =>
                  r.status === "pending" ? (
                    <div className="row wrap">
                      <button
                        className="btn sm"
                        onClick={() =>
                          dialog(
                            t("Cấp mã voucher"),
                            [{ name: "code", label: t("Mã voucher") }],
                            "/admin/gift-redemptions/" + r.id + "/events",
                            {},
                            "POST",
                            { action: "completed", reason: "" },
                          )
                        }
                      >
                        {t("Cấp mã")}
                      </button>
                      <button
                        className="btn sm ghost"
                        onClick={() =>
                          dialog(
                            t("Từ chối đổi quà"),
                            [{ name: "reason", label: t("Lý do") }],
                            "/admin/gift-redemptions/" + r.id + "/events",
                            {},
                            "POST",
                            { action: "rejected", code: "" },
                          )
                        }
                      >
                        {t("Từ chối")}
                      </button>
                    </div>
                  ) : (
                    r.reason
                  ),
              },
            ]}
          />
          {pager}
        </Card>
        <Card title={t("Danh mục và tồn kho")}>
          <Table
            rows={gifts.data || []}
            columns={[
              { label: t("Quà"), render: (r) => r.name },
              { label: t("Xu"), render: (r) => r.costXu },
              { label: t("Tồn kho"), render: (r) => r.stock },
              {
                label: "",
                render: (r) => (
                  <button
                    className="btn sm ghost"
                    onClick={() =>
                      dialog(
                        t("Cập nhật quà"),
                        [
                          { name: "name", label: t("Tên quà") },
                          {
                            name: "costXu",
                            label: t("Giá xu"),
                            type: "number",
                            min: 1,
                          },
                          {
                            name: "stock",
                            label: t("Mã còn trong kho"),
                            type: "number",
                          },
                          {
                            name: "active",
                            label: t("Đang mở đổi"),
                            type: "checkbox",
                          },
                        ],
                        "/admin/gifts/" + r.id,
                        r,
                        "PATCH",
                      )
                    }
                  >
                    {t("Sửa")}
                  </button>
                ),
              },
            ]}
          />
        </Card>
      </div>
    );
  if (path === "/admin/deals")
    return (
      <Card>
        <Table
          rows={rowData}
          columns={[
            ...common,
            { label: t("Nội dung"), render: (r) => r.body },
            { label: t("Kênh"), render: (r) => r.channel },
            { label: t("Hữu ích"), render: (r) => r.likes },
            {
              label: t("Trạng thái"),
              render: (r) =>
                r.deleted
                  ? t("Đã xóa")
                  : r.hidden
                    ? t("Đang ẩn")
                    : t("Đang hiện"),
            },
            {
              label: "",
              render: (r) =>
                !r.deleted && (
                  <div className="row wrap">
                    <button
                      className="btn sm ghost"
                      onClick={() =>
                        dialog(
                          r.hidden ? t("Hiện bài") : t("Ẩn bài"),
                          [{ name: "reason", label: t("Lý do") }],
                          "/admin/deals/" + r.id + "/events",
                          {},
                          "POST",
                          { action: r.hidden ? "show" : "hide" },
                        )
                      }
                    >
                      {r.hidden ? t("Hiện") : t("Ẩn")}
                    </button>
                    <button
                      className="btn sm ghost"
                      onClick={() =>
                        dialog(
                          t("Xóa mềm bài"),
                          [{ name: "reason", label: t("Lý do") }],
                          "/admin/deals/" + r.id + "/events",
                          {},
                          "POST",
                          { action: "delete" },
                        )
                      }
                    >
                      {t("Xóa")}
                    </button>
                  </div>
                ),
            },
          ]}
        />
        {pager}
      </Card>
    );
  if (path === "/admin/notifications")
    return (
      <div className="stack">
        <Card title={t("Gửi thông báo")}>
          <Form
            fields={[
              {
                name: "recipientId",
                label: t("User ID nhận (trống = mọi khách)"),
                required: false,
              },
              { name: "title", label: t("Tiêu đề"), max: 80 },
              {
                name: "body",
                label: t("Nội dung"),
                type: "textarea",
                max: 1000,
              },
            ]}
            submit={t("Gửi thông báo")}
            onSubmit={async (v) => {
              try {
                await ctx.act("/admin/notifications", "POST", v);
              } catch {}
            }}
          />
        </Card>
        <Card title={t("Đã gửi")}>
          <Table
            rows={rowData}
            columns={[
              { label: t("Ngày"), render: (r) => date(r.createdAt) },
              { label: t("Tiêu đề"), render: (r) => r.title },
              { label: t("Nội dung"), render: (r) => r.body },
              {
                label: t("Người nhận"),
                render: (r) => r.recipientId || t("Mọi khách"),
              },
              {
                label: "",
                render: (r) => (
                  <button
                    className="btn sm ghost"
                    onClick={async () => {
                      try {
                        await ctx.act("/admin/notifications/" + r.id, "DELETE");
                      } catch {}
                    }}
                  >
                    {t("Xóa mềm")}
                  </button>
                ),
              },
            ]}
          />
          {pager}
        </Card>
      </div>
    );
  if (path === "/admin/settings")
    return (
      <div className="stack">
        <Card title={t("Thông tin và chính sách")}>
          <Form
            fields={[
              {
                name: "brand",
                label: t("Thương hiệu"),
                max: 30,
              },
              {
                name: "supportEmail",
                label: t("Email hỗ trợ"),
                required: false,
                type: "email",
              },
              {
                name: "maxDisplayPercent",
                label: t(
                  "Mức tối đa hiển thị (%) — để trống nếu chưa có cơ sở",
                ),
                required: false,
              },
            ]}
            initial={{
              ...data.data,
              maxDisplayPercent: data.data?.maxDisplayPercent ?? "",
            }}
            submit={t("Lưu cài đặt")}
            onSubmit={async (v) => {
              try {
                await ctx.act("/admin/settings", "PUT", {
                  ...v,
                  maxDisplayPercent:
                    v.maxDisplayPercent === ""
                      ? null
                      : Number(v.maxDisplayPercent),
                });
              } catch {}
            }}
          />
        </Card>
        <CashbackPolicy ctx={ctx} />
        <FAQEditor settings={data.data} ctx={ctx} />
        {(channelQ.data || []).map((c) => (
          <Card title={c.name} key={c.id}>
            <div className="row between">
              <Status value={c.status} />
              {c.id !== "shopee" ? (
                <span className="mute small">{t("Chưa cấu hình")}</span>
              ) : (
                <button
                  className="btn sm ghost"
                  onClick={() =>
                    dialog(
                      t("Cấu hình Shopee"),
                      [
                        {
                          name: "status",
                          label: t("Trạng thái"),
                          options: [
                            {
                              value: "not_configured",
                              label: t("Chưa cấu hình"),
                            },
                            {
                              value: "available",
                              label: t("Đang chạy"),
                            },
                            {
                              value: "temporarily_unavailable",
                              label: t("Tạm gián đoạn"),
                            },
                          ],
                        },
                        {
                          name: "template",
                          label: t("Mẫu link đã kiểm chứng"),
                          required: false,
                        },
                      ],
                      "/admin/affiliate-channels/shopee",
                      {
                        status: c.status,
                        template:
                          c.settings?.template ||
                          "https://s.shopee.vn/an_redir",
                      },
                      "PATCH",
                    )
                  }
                >
                  {t("Cấu hình")}
                </button>
              )}
            </div>
            <p className="small mute">
              {t(
                "Chỉ bật chạy thật khi tracking và quyền affiliate đã được kiểm chứng.",
              )}
            </p>
          </Card>
        ))}
      </div>
    );
  if (path === "/admin/accounts")
    return (
      <div className="stack">
        <Card title={t("Tạo tài khoản nội bộ")}>
          <Form
            fields={[
              { name: "username", label: "Username" },
              { name: "name", label: t("Tên hiển thị") },
              {
                name: "password",
                label: t("Mật khẩu tạm (12–128 ký tự)"),
                type: "password",
                max: 128,
              },
              {
                name: "role",
                label: t("Vai trò"),
                options: [
                  { value: "staff", label: t("Nhân viên") },
                  { value: "admin", label: t("Quản trị") },
                ],
              },
              {
                name: "permissions",
                label: t("Quyền staff (phân cách dấu phẩy)"),
                required: false,
                placeholder: permissionNames.join(","),
              },
            ]}
            submit={t("Tạo tài khoản")}
            onSubmit={async (v) => {
              try {
                await ctx.act("/admin/internal-accounts", "POST", {
                  ...v,
                  permissions: String(v.permissions)
                    .split(",")
                    .map((p) => p.trim())
                    .filter(Boolean),
                });
              } catch {}
            }}
          />
        </Card>
        <Card title={t("Tài khoản đã cấp")}>
          <Table
            rows={rowData}
            columns={[
              { label: "Username", render: (r) => r.username },
              { label: t("Tên"), render: (r) => r.name },
              { label: t("Vai trò"), render: (r) => r.role },
              {
                label: t("Quyền"),
                render: (r) => (r.permissions || []).join(", "),
              },
              {
                label: t("Trạng thái"),
                render: (r) =>
                  r.blocked
                    ? t("Khóa")
                    : r.mustChangePassword
                      ? t("Cần đổi mật khẩu")
                      : t("Hoạt động"),
              },
              {
                label: "",
                render: (r) =>
                  r.id !== ctx.me?.id && (
                    <button
                      className="btn sm ghost"
                      onClick={() =>
                        ctx.dialog({
                          title: t("Reset tài khoản và quyền"),
                          fields: [
                            {
                              name: "password",
                              label: t("Mật khẩu tạm mới"),
                              type: "password",
                            },
                            {
                              name: "permissions",
                              label: t("Quyền staff (dấu phẩy)"),
                              required: false,
                            },
                            {
                              name: "blocked",
                              label: t("Khóa tài khoản"),
                              type: "checkbox",
                            },
                          ],
                          initial: {
                            permissions: (r.permissions || []).join(","),
                            blocked: r.blocked,
                          },
                          submit: t("Reset và thu hồi phiên"),
                          action: async (v) => {
                            await ctx.act(
                              "/admin/internal-accounts/" + r.id + "/reset",
                              "POST",
                              {
                                ...v,
                                permissions: String(v.permissions)
                                  .split(",")
                                  .map((p) => p.trim())
                                  .filter(Boolean),
                              },
                            );
                            ctx.dialog(null);
                          },
                        })
                      }
                    >
                      {t("Reset/quyền")}
                    </button>
                  ),
              },
            ]}
          />
          {pager}
        </Card>
      </div>
    );
  if (path === "/admin/imports")
    return (
      <div className="stack">
        <Card title={t("Nhập báo cáo CSV")}>
          <p className="mute login-copy">
            {t(
              "UTF-8, tối đa 10 MB/50.000 dòng. Hoa hồng và giá trị là số nguyên VND. Xem file mẫu trong database/seeds.",
            )}
          </p>
          <label className="field">
            {t("Mapping cột (JSON, bỏ trống dùng tên chuẩn)")}
            <textarea
              className="inp"
              value={mapping}
              onChange={(e) => setMapping(e.target.value)}
            />
          </label>
          <input
            className="inp"
            aria-label={t("Chọn báo cáo CSV")}
            type="file"
            accept=".csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const form = new FormData();
              form.set("file", f);
              form.set("mapping", mapping);
              try {
                const b = await ctx.act("/admin/order-imports", "POST", form);
                setSelected(b.id);
              } catch {}
              e.target.value = "";
            }}
          />
        </Card>
        <Card title={t("Batch đối soát")}>
          <Table
            rows={rowData}
            columns={[
              { label: t("Ngày"), render: (r) => date(r.createdAt) },
              { label: "File", render: (r) => r.filename },
              {
                label: t("Trạng thái"),
                render: (r) => <Status value={r.status} />,
              },
              {
                label: t("Dòng"),
                render: (r) =>
                  Object.entries(r.counts || {})
                    .map(([k, v]) => k + ": " + v)
                    .join(" · "),
              },
              {
                label: "",
                render: (r) => (
                  <div className="row wrap">
                    <button
                      className="btn sm ghost"
                      onClick={() => setSelected(r.id)}
                    >
                      Xem preview
                    </button>
                    {r.status === "preview" && (
                      <button
                        className="btn sm"
                        onClick={async () => {
                          try {
                            await ctx.act(
                              "/admin/order-imports/" + r.id + "/commit",
                            );
                          } catch {}
                        }}
                      >
                        Commit
                      </button>
                    )}
                    {r.status === "failed" && (
                      <button
                        className="btn sm ghost"
                        onClick={async () => {
                          try {
                            await ctx.act(
                              "/admin/order-imports/" + r.id + "/retry",
                            );
                          } catch {}
                        }}
                      >
                        {t("Thử lại")}
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
          {pager}
        </Card>
        {selected && (
          <Card title={t("Preview dòng CSV")}>
            {rows.error ? (
              <p className="err">{t(rows.error.message)}</p>
            ) : (
              <Table
                rows={rows.data || []}
                columns={[
                  { label: t("Dòng"), render: (r) => r.number },
                  {
                    label: t("Trạng thái"),
                    render: (r) => <Status value={r.status} />,
                  },
                  {
                    label: t("Đơn/sản phẩm"),
                    render: (r) => (
                      <>
                        {r.payload?.orderId}/{r.payload?.lineId}
                        <p>{r.payload?.productName}</p>
                      </>
                    ),
                  },
                  { label: "Tracking", render: (r) => r.payload?.trackingCode },
                  {
                    label: t("Nguồn sàn"),
                    render: (r) => r.payload?.status,
                  },
                  { label: t("Lỗi"), render: (r) => r.error },
                  {
                    label: "",
                    render: (r) =>
                      r.status === "unmatched" && (
                        <button
                          className="btn sm ghost"
                          onClick={() =>
                            dialog(
                              t("Khớp tracking từ bằng chứng"),
                              [
                                {
                                  name: "trackingCode",
                                  label: t("Tracking đúng có trong hệ thống"),
                                },
                                {
                                  name: "reason",
                                  label: t("Bằng chứng/lý do"),
                                },
                              ],
                              "/admin/order-imports/" +
                                selected +
                                "/rows/" +
                                r.number +
                                "/resolve",
                            )
                          }
                        >
                          {t("Khớp")}
                        </button>
                      ),
                  },
                ]}
              />
            )}
            <p className="small mute">
              {t(
                "Đơn đã nhập vẫn chờ admin duyệt. Dòng adjustment cần kiểm tra ở Đối soát đơn.",
              )}
            </p>
          </Card>
        )}
      </div>
    );
  if (path === "/admin/audit")
    return (
      <div className="stack">
        <Card title={t("Kiểm tra sổ ví")}>
          {ledger.error ? (
            <p className="err">{t(ledger.error.message)}</p>
          ) : ledger.isPending ? (
            <p>{t("Đang kiểm tra…")}</p>
          ) : ledger.data?.length ? (
            <Table
              rows={ledger.data}
              columns={[
                { label: t("Tài khoản"), render: (r) => r.accountId },
                {
                  label: t("Số dư"),
                  render: (r) => money(r.balance),
                },
                {
                  label: t("Theo ledger"),
                  render: (r) => money(r.ledgerBalance),
                },
              ]}
            />
          ) : (
            <p className="pill ok">{t("Số dư khớp với sổ giao dịch")}</p>
          )}
        </Card>
        <Card title={t("Lịch sử quản trị")}>
          <Table
            rows={rowData}
            columns={[
              { label: t("Ngày"), render: (r) => date(r.createdAt) },
              { label: "Actor", render: (r) => r.actorId },
              { label: t("Thao tác"), render: (r) => r.action },
              {
                label: t("Đối tượng"),
                render: (r) => r.resource,
              },
              {
                label: t("Chi tiết"),
                render: (r) => (
                  <span className="small">{JSON.stringify(r.payload)}</span>
                ),
              },
            ]}
          />
          {pager}
        </Card>
      </div>
    );
  return (
    <Card>
      <Empty text={t("Không tìm thấy trang quản trị.")} />
    </Card>
  );
}
function ShopeeLoginPanel({ ctx, publisher, status, error, remoteAvailable, localAvailable }: { ctx: AppContext; publisher: string; status?: Data; error: Error | null; remoteAvailable?: boolean; localAvailable?: boolean }) {
  const { t } = useI18n();
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const states: Record<string, string> = {
    not_started: "Chưa mở Chrome",
    checking: "Đang kiểm tra phiên…",
    authenticated: "Đã đăng nhập",
    login_required: "Cần đăng nhập lại",
    verification_required: "Shopee yêu cầu xác minh truy cập",
    unavailable: "Chromium hoặc Shopee chưa sẵn sàng",
  };
  async function checkSession() {
    setBusy(true);
    setFailure("");
    setMessage("");
    try {
      const result = await api<Data>("/admin/browser/session-checks", "POST");
      setMessage(result.authenticated
        ? "Đã đăng nhập Shopee. Backend đang dùng phiên Chrome này để kiểm tra sản phẩm."
        : result.state === "verification_required"
          ? "Shopee yêu cầu xác minh. Mở Chrome trên server để hoàn tất, sau đó kiểm tra phiên lại."
          : "Chưa đăng nhập Shopee. Mở Chrome trên server và đăng nhập trước khi kiểm tra phiên.");
      await client.invalidateQueries({ queryKey: ["/admin/browser"] });
    } catch (e) {
      setFailure((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <Card title={t("Đăng nhập Shopee")}>
    <div className="stack">
      {remoteAvailable || localAvailable ? <RemoteBrowserAccess local={!remoteAvailable} /> : <p className="small mute">{t("Quản trị viên cần bật Chrome từ xa trên backend để đăng nhập Shopee tại đây.")}</p>}
      <p>{t("Chromium")}: {status?.browser ? t("Đang chạy") : t("Chưa mở Chrome")} · {t("Phiên")}: {t(states[status?.state] || (status?.authenticated ? "Đã đăng nhập" : "Chưa xác minh"))}</p>
      <p className="small mute">{t("Sau khi đăng nhập trong Chrome trên server, quay lại đây và kiểm tra phiên. Backend dùng trực tiếp phiên Chrome đang chạy.")}</p>
      <p className="small mute">{t("Không có disk giữ profile, bạn cần đăng nhập lại sau khi backend restart.")}</p>
      <div><button className="btn ghost" type="button" disabled={busy || !status?.browser} onClick={() => void checkSession()}>{busy ? t("Đang kiểm tra phiên…") : t("Tôi đã đăng nhập — Kiểm tra phiên")}</button></div>
      {(failure || error) && <p className="err" role="alert">{t(failure || error?.message || "")}</p>}
      {message && <p role="status">{t(message)}</p>}
      <PublisherSettings key={publisher} publisher={publisher} ctx={ctx} />
    </div>
  </Card>;
}
function PublisherSettings({ publisher, ctx }: { publisher: string; ctx: AppContext }) {
  const { t } = useI18n();
  const [value, setValue] = useState(publisher);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  return <form className="stack" onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFailure("");
    try { await ctx.act("/admin/browser/publisher", "PUT", { publisher: value.trim() }); }
    catch (error) { setFailure((error as Error).message); }
    finally { setBusy(false); }
  }}>
    <label className="field" htmlFor="shopee-publisher">{t("Affiliate ID (Shopee Publisher)")}</label>
    <input id="shopee-publisher" className="inp" value={value} onChange={event => setValue(event.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={32} autoComplete="off" disabled={busy} />
    <p className="small mute">{t("Nhập Affiliate ID của tài khoản vừa đăng nhập. Mã được lưu trong cấu hình hệ thống và dùng khi tạo link nhận hoa hồng.")}</p>
    <div><button className="btn ghost" disabled={busy || value.trim() === publisher}>{busy ? t("Đang lưu…") : t("Lưu Affiliate ID")}</button></div>
    {failure && <p className="err" role="alert">{t(failure)}</p>}
  </form>;
}
function FAQEditor({ settings, ctx }: { settings: Data; ctx: AppContext }) {
  const { t } = useI18n();
  const signature = JSON.stringify(settings.faq || []);
  const [items, setItems] = useState<
    {
      question: string;
      answer: string;
    }[]
  >(settings.faq || []);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setItems(JSON.parse(signature));
  }, [signature]);
  function update(index: number, field: "question" | "answer", value: string) {
    setItems(
      items.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }
  return (
    <Card title={t("Câu hỏi thường gặp")}>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await ctx.act("/admin/settings", "PUT", {
              brand: settings.brand,
              supportEmail: settings.supportEmail,
              maxDisplayPercent: settings.maxDisplayPercent,
              faq: items,
            });
          } catch {
          } finally {
            setBusy(false);
          }
        }}
      >
        {items.map((row, i) => (
          <div className="stack" key={i}>
            <label className="field">
              {t("Câu hỏi")}
              {i + 1}
              <input
                className="inp"
                required
                maxLength={150}
                value={row.question}
                onChange={(e) => update(i, "question", e.target.value)}
              />
            </label>
            <label className="field">
              {t("Câu trả lời")}
              <textarea
                className="inp"
                required
                maxLength={1000}
                value={row.answer}
                onChange={(e) => update(i, "answer", e.target.value)}
              />
            </label>
            <div>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setItems(items.filter((_, n) => n !== i))}
              >
                {t("Xóa câu hỏi")}
              </button>
            </div>
          </div>
        ))}
        <div className="row wrap">
          <button
            type="button"
            className="btn ghost"
            disabled={items.length >= 20}
            onClick={() => setItems([...items, { question: "", answer: "" }])}
          >
            {t("Thêm câu hỏi")}
          </button>
          <button className="btn" disabled={busy}>
            {busy ? t("Đang lưu…") : t("Lưu FAQ")}
          </button>
        </div>
      </form>
    </Card>
  );
}
function EvidenceUpload({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const [id, setId] = useState("");
  return (
    <div className="evidence-upload">
      <h3>{t("Tải bằng chứng chuyển khoản")}</h3>
      <p className="small mute">{t("PNG, JPEG hoặc PDF, tối đa 10 MB.")}</p>
      <input
        className="inp"
        aria-label={t("Bằng chứng chuyển khoản")}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const form = new FormData();
          form.set("file", f);
          try {
            const v = await ctx.act("/admin/private-files", "POST", form);
            setId(v.id);
          } catch {}
          e.target.value = "";
        }}
      />
      {id && (
        <p>
          {t("Mã bằng chứng:")}
          <code>{id}</code>
          <button
            className="btn sm ghost"
            onClick={() => navigator.clipboard.writeText(id)}
          >
            {t("Sao chép")}
          </button>
        </p>
      )}
    </div>
  );
}
