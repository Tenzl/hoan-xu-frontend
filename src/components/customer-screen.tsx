"use client";
import { tierName } from "@/lib/cashback";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import { moneyRange, rewardEstimate } from "@/lib/wallet-preview";
import type { Dashboard, Wallet as WalletData } from "@/lib/domain";
import { date, money } from "@/lib/api";
import { checkerErrorMessage } from "@/lib/checker-errors";
import { ArrowUpRight, Calendar, Gift, History, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import type { AppContext } from './app-context';
import { CashbackLinkBuilder } from "./cashback-link-builder";
import { CustomerHistory } from "./customer-history";
import { DashboardCheckin } from "./dashboard-checkin";
import { xu, type Leaderboard } from "./leaderboard";
import { Mascot } from "./mascot";
import { useCashbackFlow } from "./cashback-flow";
import { useRouter } from "next/navigation";
import { Purchases } from "./purchases";
import { GiftShop } from "./gift-shop";
import { LoginGate, QueryState, useData } from './screen-shared';
import { Card, Empty, Form, Status, Table, type Data } from "./ui";
import { WithdrawalForm } from "./withdrawal-form";
export function Stats({ items }: {
    items: [
        string,
        unknown,
        boolean?
    ][];
}) {
    const { t } = useI18n();
    return (<div className="grid4">
      {items.map(([label, value, currency]) => (<div className="card stat" key={t(label)}>
          <span className="small mute">{t(label)}</span>
          <b className="num">{currency ? money(value) : String(value ?? 0)}</b>
        </div>))}
    </div>);
}
export function Pager({ page, onPage, hasNext = false, }: {
    page: number;
    onPage: (n: number) => void;
    hasNext?: boolean;
}) {
    const { t } = useI18n();
    return (<div className="row between pager">
      <button className="btn sm ghost" disabled={page === 1} onClick={() => onPage(page - 1)}>
        {t("← Trước")}
      </button>
      <span className="small mute">
        {t("Trang")} {page}
      </span>
      <button className="btn sm ghost" disabled={!hasNext} onClick={() => onPage(page + 1)}>
        {t("Tiếp →")}
      </button>
    </div>);
}
export function LinkBox({ ctx }: {
    ctx: AppContext;
}) {
    const { t, language } = useI18n();
    const router = useRouter();
    const flow = useCashbackFlow();
    const active = useRef(true);
    useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
    const channelQ = useData("/affiliate-channels");
    const membership = useData<Dashboard>("/me/dashboard", ctx.me?.role === "customer");
    const range = moneyRange(rewardEstimate(flow.check.loading || flow.check.error ? undefined : flow.check.product, membership.data?.membership, flow.result).current, language);
    const checkError = flow.check.error && checkerErrorMessage(flow.check.errorCode, flow.check.error);
    return (<section className="ticket overview-ticket">
      <div className="ticket-main">
        <h2>{t("Dán link sản phẩm, nhận link hoàn tiền")}</h2>
        <p className="mute small">{t("Mua sắm thả ga, tích Xu đổi quà.")}</p>
        <form className="overview-link-form" aria-busy={flow.creating || flow.check.loading} onSubmit={async (event) => {
            event.preventDefault();
            if (flow.check.loading) return;
            if (await flow.create(ctx) && active.current)
                router.push("/link", { scroll: false });
        }}>
          <label htmlFor="overview-product-url">{t("Link sản phẩm Shopee")}</label>
          <input id="overview-product-url" className="inp" type="url" required maxLength={2048} value={flow.url} placeholder="https://shopee.vn/..." autoComplete="off" spellCheck={false} onChange={event => flow.changeURL(event.target.value)}/>
          {checkError && <div className={"note error-note" + (flow.check.errorCode === "NOT_PRODUCT_LINK" ? " product-input-warning" : "")} role="alert"><p>{t(checkError)}</p>{flow.check.errorCode !== "NOT_PRODUCT_LINK" && <button type="button" className="btn sm ghost" onClick={flow.retryCheck}>{t("Thử lại")}</button>}</div>}
          {flow.url.trim() && !flow.check.loading && !checkError && ctx.me?.role === "customer" && (membership.isError || !range) && <p className="small mute">{t(membership.isError ? "Chưa tải được quyền lợi của bạn." : "Chưa xem được tiền hoàn cho món này. Bạn thử lại nhé.")}{membership.isError && <button type="button" className="btn sm ghost" onClick={() => void membership.refetch()}>{t("Thử lại")}</button>}</p>}
          <div className="overview-link-row">
            <button type="submit" className="btn overview-link-submit" aria-busy={flow.creating || flow.check.loading} disabled={!flow.url.trim() || flow.creating || flow.check.loading || flow.shopBlocked}>{t(flow.creating ? "Đang xử lý…" : flow.check.loading ? "Đang kiểm tra…" : "Lấy link hoàn tiền")}{!flow.creating && !flow.check.loading && <ArrowUpRight size={17} aria-hidden="true"/>}</button>
            <p className="overview-link-preview" aria-live="polite" aria-atomic="true">
              {flow.url.trim() && (flow.check.loading ? <span role="status">{t("Đang tính tiền hoàn dự kiến…")}</span> : range && ctx.me?.role === "customer" && !membership.isError ? <><span aria-hidden="true">← </span>{t("Bạn được hoàn dự kiến")} <strong className="num">{range}</strong>{t(", lấy link ngay")}</> : null)}
            </p>
          </div>
          {flow.error && <p className="err" role="alert">{t(flow.error)}</p>}
        </form>
      </div>
      <div className="ticket-stub">
        <Mascot size={88}/>
        <div><b>{t("Tích lũy")}</b><span>{t("Sắm món mình mê, rước quà mang về.")}</span></div>
      </div>
      <div className="ticket-channels full">
        {(channelQ.data || []).map(c => <span key={c.id}>{c.name} <Status value={c.status} label={c.status === "not_configured" ? t("Chưa mở") : undefined}/></span>)}
      </div>
    </section>);
}
export function CustomerScreen({ path, ctx }: {
    path: string;
    ctx: AppContext;
}) {
    const { t, language } = useI18n();
    const [page, setPage] = useState(1);
    const customer = ctx.me?.role === "customer";
    let endpoint = "";
    if (path === "/")
        endpoint = "/me/dashboard";
    if (path === "/deal")
        endpoint = "/deals?page=" + page;
    const data = usePagedQuery<any>(endpoint, !!endpoint && (customer || path === "/deal"), false, ctx.me?.id);
    const board = useData<Leaderboard>("/leaderboards?period=month", path === "/");
    const wallet = useData<WalletData>("/wallet", customer && path === "/wallet");
    const recent = useData("/orders?perPage=4", customer && path === "/");
    if (path === "/help")
        return (<div className="stack">
        <Card title={t("Câu hỏi thường gặp")}>
          {(ctx.config.faq || []).map((item: Data, index: number) => (<details key={index}>
              <summary>{t(item.question)}</summary>
              <p>{t(item.answer)}</p>
            </details>))}
          {!ctx.config.faq?.length && (<p className="mute">{t("Nội dung hỗ trợ đang được cập nhật.")}</p>)}
        </Card>
        <Card>
          <div className="row">
            <Mascot size={90}/>
            <div>
              <h2>{t("Cần kiểm tra đơn của bạn?")}</h2>
              {ctx.config.supportEmail ? (<a href={"mailto:" + ctx.config.supportEmail}>
                  {ctx.config.supportEmail}
                </a>) : (<p className="mute">
                  {t("Kênh hỗ trợ sẽ sớm được cập nhật.")}
                </p>)}
            </div>
          </div>
        </Card>
      </div>);
    if (path === "/" && !customer)
        return (<div className="stack">
        <LinkBox ctx={ctx}/>
        <LoginGate />
        <Card title={t("Khám phá Hoàn Xu")}>
          <div className="grid3">
            <div>
              <Calendar />
              <h3>{t("Điểm danh mỗi ngày")}</h3>
              <p className="mute">{t("Giữ chuỗi và nhận thưởng xu.")}</p>
            </div>
            <div>
              <Wallet />
              <h3>{t("Ví minh bạch")}</h3>
              <p className="mute">{t("Theo dõi từng lần hoàn và rút tiền.")}</p>
            </div>
            <div>
              <Gift />
              <h3>{t("Đổi quà")}</h3>
              <p className="mute">
                {t("Tích xu để đổi voucher có trong kho.")}
              </p>
            </div>
          </div>
        </Card>
      </div>);
    if (path === "/link")
        return (<div className="stack link-screen">
        <CashbackLinkBuilder ctx={ctx}/>
      </div>);
    if (!customer && path !== "/deal")
        return <LoginGate />;
    if (path === "/history")
        return <Suspense fallback={<Card><p role="status">{t("Đang tải lịch sử…")}</p></Card>}><CustomerHistory /></Suspense>;
    if (path === "/")
        return (<QueryState q={data}>
        <div className="stack">
          <LinkBox ctx={ctx}/>
          <Stats items={[
                [t("Chờ duyệt (dự kiến)"), data.data?.pending, true],
                [t("Đã duyệt"), data.data?.approved, true],
                [t("Có thể rút"), data.data?.available, true],
                [t("Tổng đơn"), data.data?.totalOrders],
            ]}/>
          <DashboardCheckin ctx={ctx}/>
          <Card>
            <div className="row">
              <Mascot size={80}/>
              <div className="grow">
                <h3>
                  {t("Hạng")}{" "}
                  {data.data?.membership ? t(tierName(data.data.membership.tierCode)) : "—"}
                </h3>
                <p className="mute">
                  {data.data?.approvedOrders || 0}
                  {t("đơn đã duyệt")}
                </p>
                {data.data?.membership && <>
                  <p className="small mute">{t("Sắm món mình mê, rước quà mang về.")}</p>
                  <p className="small mute">{data.data.membership.nextTier ? <>{t("Còn")} {data.data.membership.ordersToNext} {t("đơn để lên hạng")} {t(tierName(data.data.membership.nextTier.tierCode))}</> : t("Hạng cao nhất")}</p>
                </>}
              </div>
            </div>
          </Card>
          <div className="grid2 one">
            <Card title={t("Đơn gần đây")}>
              <OrderTable rows={recent.data || []}/>
            </Card>
            <Card title={t("Top Hoàn Xu tháng này")}>
              <Table rows={(board.data?.items || []).slice(0, 5)} columns={[
                { label: t("Thành viên"), render: (r) => r.name },
                {
                    label: t("Hoàn Xu"),
                    render: (r) => xu(r.xu, language),
                },
                { label: t("Đơn"), render: (r) => r.orders },
            ]}/>
              {board.error && <p className="err">{t(board.error.message)}</p>}
              <Link className="btn sm ghost" href="/top?period=month">{t("Xem cuộc đua")}<ArrowUpRight size={15}/></Link>
            </Card>
          </div>
        </div>
      </QueryState>);
    if (path === "/orders")
        return <Purchases ctx={ctx}/>;
    if (path === "/deal")
        return (<div className="stack">
        {customer ? (<Card title={t("Chia sẻ deal bạn tìm được")}>
            <Form fields={[
                    { name: "channel", label: t("Kênh"), options: channels },
                    {
                        name: "body",
                        label: t("Nội dung"),
                        type: "textarea",
                        max: 400,
                    },
                ]} submit={t("Đăng deal")} onSubmit={async (v) => {
                    try {
                        await ctx.act("/deals", "POST", v);
                    }
                    catch { }
                }}/>
          </Card>) : (<LoginGate />)}
        <QueryState q={data}>
          {!(data.data || []).length ? (<Card>
              <Empty text={t("Chưa có deal cộng đồng.")}/>
            </Card>) : ((data.data || []).map((d: Data) => (<Card key={d.id}>
                <div className="row between">
                  <div>
                    <b>{d.name}</b>
                    <p className="small mute">
                      {d.channel} · {date(d.createdAt)}
                    </p>
                  </div>
                  <button className="btn sm ghost" disabled={!customer} onClick={async () => {
                    try {
                        await ctx.act("/deals/" + d.id + "/likes/me", "PUT");
                    }
                    catch { }
                }}>
                    {t("Hữu ích ·")}
                    {d.likes}
                  </button>
                </div>
                <p className="deal-body">{d.body}</p>
                {customer && (<button className="btn sm ghost" onClick={async () => {
                        try {
                            await ctx.act("/deals/" + d.id + "/likes/me", "DELETE");
                        }
                        catch { }
                    }}>
                    {t("Bỏ hữu ích")}
                  </button>)}
              </Card>)))}
        </QueryState>
        <Pager page={page} onPage={setPage} hasNext={data.meta?.hasNext}/>
      </div>);
    if (path === "/gift")
        return <GiftShop key={ctx.me?.id} ctx={ctx}/>;
    if (path === "/wallet")
        return (<div className="stack">
        <QueryState q={wallet}>
          <Stats items={[
                [t("Có thể rút"), wallet.data?.available, true],
                [t("Đang chờ rút / đổi quà"), Number(wallet.data?.held || 0) + Number(wallet.data?.giftHeld || 0), true],
                [t("Khoản thiếu"), wallet.data?.debt, true],
            ]}/>
        </QueryState>
        <Card title={t("Rút tiền về ngân hàng")}>
          <WithdrawalForm ctx={ctx} available={Number(wallet.data?.available || 0)} debt={Number(wallet.data?.debt || 0)}/>
        </Card>
        <div className="history-shortcuts"><Link className="history-shortcut" href="/history"><History size={18}/>{t("Xem lịch sử ví")}<ArrowUpRight size={16}/></Link><Link className="history-shortcut" href="/history?tab=withdrawals"><Wallet size={18}/>{t("Xem lịch sử rút tiền")}<ArrowUpRight size={16}/></Link></div>
      </div>);
    return (<Card>
      <Empty text={t("Không tìm thấy trang.")}/>
      <Link href="/">{t("Về tổng quan")}</Link>
    </Card>);
}
export function OrderTable({ rows }: {
    rows: Data[];
}) {
    const { t } = useI18n();
    return (<div className="stack cashback-orders">
    <p className="small mute">{t("Mua món mê say, theo dõi Xu mỗi ngày.")}</p>
    <Table scrollLabel={t("Bảng đơn hàng")} rows={rows} columns={[
            {
                label: t("Sản phẩm"),
                render: (r) => (<>
              <b>{r.productName}</b>
              <p className="small mute">
                {r.channel} · {date(r.orderedAt)}
              </p>
            </>),
            },
            { label: t("Giá trị"), render: (r) => money(r.value) },
            { label: t("Tỷ lệ đã chọn"), render: (r) => <>{r.sharePercent == null ? "—" : `${r.sharePercent}%`}<p className="small mute">{t(tierName(r.tierCode))}</p></> },
            {
                label: t("Hoàn tiền"),
                render: (r) => r.status === "rejected"
                    ? t("0đ")
                    : (r.status === "pending" ? "≈ " : "") + money(r.cashback),
            },
            {
                label: t("Trạng thái"),
                render: (r) => <Status value={r.status}/>,
            },
        ]}/>
    </div>);
}
const channels = [
    { value: "shopee", label: "Shopee" },
    { value: "lazada", label: "Lazada" },
    { value: "tiktok", label: "TikTok Shop" },
    { value: "tiki", label: "Tiki" },
];
