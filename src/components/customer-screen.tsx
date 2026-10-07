"use client";
import { WeeklyPrizeBanner } from "./weekly-prizes";
import { TierBenefits } from "./tier-benefits";
import { MembershipBenefits } from "./membership-benefits";
import { configuredTierName } from "@/lib/cashback";
import { useI18n } from "@/lib/i18n";
import { usePagedQuery } from "@/lib/paged-query";
import { moneyRange, rewardEstimate } from "@/lib/wallet-preview";
import type { Dashboard, Wallet as WalletData } from "@/lib/domain";
import { date, money } from "@/lib/api";
import { checkerErrorMessage } from "@/lib/checker-errors";
import { ArrowUpRight, Gift, History } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState } from "react";
import type { AppContext } from './app-context';
import { CashbackLinkBuilder } from "./cashback-link-builder";
import { CustomerHistory } from "./customer-history";
import { DashboardCheckin } from "./dashboard-checkin";
import { LeaderboardCelebration, type Leaderboard } from "./leaderboard";
import { Mascot } from "./mascot";
import { useCashbackFlow } from "./cashback-flow";
import { useRouter } from "next/navigation";
import { Purchases } from "./purchases";
import { GiftShop } from "./gift-shop";
import { LoginGate, QueryState, useData } from './screen-shared';
import { Card, Empty, Form, Table, type Data } from "./ui";
import { XuBalances, XuExchange } from "./xu-exchange";
import { WithdrawalForm } from "./withdrawal-form";
import { AffiliateChannels } from "./affiliate-channels";
import { XuAmount } from "./xu-amount";
import { ShoppingGuide, CoinGuide, Discover } from "./customer-guidance";
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

    const membership = useData<Dashboard>("/me/dashboard", ctx.me?.role === "customer",ctx.me?.id);
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
          <input id="overview-product-url" className="inp" type="text" inputMode="url" required maxLength={2048} value={flow.url} placeholder="https://shopee.vn/..." autoComplete="off" spellCheck={false} onChange={event => flow.changeURL(event.target.value)}/>
          {flow.inputError && <p className="err" role="alert">{t(flow.inputError)}</p>}
          {checkError && <div className={"note error-note" + (flow.check.errorCode === "NOT_PRODUCT_LINK" ? " product-input-warning" : "")} role="alert"><p>{t(checkError)}</p>{flow.check.errorCode !== "NOT_PRODUCT_LINK" && <button type="button" className="btn sm ghost" onClick={flow.retryCheck}>{t("Thử lại")}</button>}</div>}
          {flow.url.trim() && !flow.check.loading && !checkError && ctx.me?.role === "customer" && (membership.isError || !range) && <p className="small mute">{t(membership.isError ? "Chưa tải được quyền lợi của bạn." : "Chưa xem được tiền hoàn cho món này. Bạn thử lại nhé.")}{membership.isError && <button type="button" className="btn sm ghost" onClick={() => void membership.refetch()}>{t("Thử lại")}</button>}</p>}
          <div className="overview-link-row">
            <button type="submit" className="btn overview-link-submit" aria-busy={flow.creating || flow.check.loading} disabled={!!flow.inputError || !flow.url.trim() || flow.creating || flow.check.loading || flow.shopBlocked}>{t(flow.creating ? "Đang xử lý…" : flow.check.loading ? "Đang kiểm tra…" : "Lấy link hoàn tiền")}{!flow.creating && !flow.check.loading && <ArrowUpRight size={17} aria-hidden="true"/>}</button>
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
      <div className="ticket-channels full"><AffiliateChannels/></div>
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
    if (path === "/" || path === "/wallet")
        endpoint = "/me/dashboard";
    if (path === "/deal")
        endpoint = "/deals?page=" + page;
    const dashboard = useData<any>("/me/dashboard", customer && endpoint === "/me/dashboard", ctx.me?.id);
    const paged = usePagedQuery<any>(endpoint, path === "/deal", false, ctx.me?.id);
    const data = endpoint === "/me/dashboard" ? { ...dashboard, meta: undefined } : paged;
    const board = useData<Leaderboard>("/leaderboards?period=month", path === "/");
    const wallet = useData<WalletData>("/wallet", customer && path === "/wallet",ctx.me?.id);
    if (path === "/help") return <div className="stack">
      <ShoppingGuide important/><CoinGuide/>
      <Card title={t("Câu hỏi thường gặp")}>
        {(ctx.config.faq || []).map((item: Data, index: number) => <details key={index}><summary>{t(item.question)}</summary><p>{t(item.answer)}</p></details>)}
        {!ctx.config.faq?.length && <p className="mute">{t("Nội dung hỗ trợ đang được cập nhật.")}</p>}
      </Card>
      <Card title={t("Cần kiểm tra đơn của bạn?")}><p>{t("Gửi mã đơn Shopee và link hoàn tiền đã dùng để hỗ trợ kiểm tra.")}</p>{ctx.config.supportEmail ? <a href={"mailto:" + ctx.config.supportEmail}>{ctx.config.supportEmail}</a> : <p className="mute">{t("Kênh hỗ trợ sẽ sớm được cập nhật.")}</p>}</Card>
    </div>;
    if (path === "/discover") return <Discover/>;
    if (path === "/membership") return <MembershipBenefits ctx={ctx}/>;
    if (path === "/link") return <div className="stack link-screen"><CashbackLinkBuilder ctx={ctx}/></div>;
    if (path === "/" && !customer) return <div className="stack"><LinkBox ctx={ctx}/><ShoppingGuide/><LoginGate/><WeeklyPrizeBanner/></div>;
    if (!["/", "/orders", "/wallet", "/checkin", "/history", "/gift", "/deal"].includes(path)) return <Card><Empty text={t("Không tìm thấy trang.")}/><div className="row"><Link className="btn ghost" href="/">{t("Về tổng quan")}</Link><Link className="btn" href="/link">{t("Lấy link hoàn tiền")}</Link></div></Card>;
    if (!customer && path !== "/deal") return <LoginGate/>;
    if (path === "/checkin") return <DashboardCheckin ctx={ctx}/>;
    if (path === "/history") return <Suspense fallback={<Card><p role="status">{t("Đang tải lịch sử…")}</p></Card>}><CustomerHistory scope={ctx.me?.id}/></Suspense>;
    if (path === "/") return <div className="stack">
      <LinkBox ctx={ctx}/>
      <DashboardCheckin ctx={ctx}/>
      <QueryState q={data}><Card><details><summary>{t("Quyền lợi thành viên")} · {data.data?.membership ? t(configuredTierName(data.data.membership, language)) : "—"}</summary>{data.data?.membership && <TierBenefits membership={data.data.membership}/>}</details></Card></QueryState>
      <div className="top-screen overview-top-five"><QueryState q={board}>{board.data?.items ? <LeaderboardCelebration board={board.data} count={5}/> : <Card><Empty text={t("Chưa có Hoàn Xu được duyệt trong kỳ này. Vị trí đầu tiên đang chờ bạn.")}/></Card>}</QueryState><Link className="text-link" href="/top?period=month">{t("Xem bảng xếp hạng")} →</Link></div>
      <WeeklyPrizeBanner/>
    </div>;
    if (path === "/orders") return <Purchases ctx={ctx}/>;
    if (path === "/deal") return <div className="stack">
      <QueryState q={data}>{!(data.data || []).length ? <Card><Empty text={t("Chưa có ưu đãi cộng đồng.")}/></Card> : (data.data || []).map((d: Data)=><CommunityDeal key={d.id} deal={d} ctx={ctx}/>)}</QueryState>
      {customer ? <Card><details><summary>{t("Chia sẻ ưu đãi")}</summary><Form fields={[{name:"channel",label:t("Kênh"),options:channels},{name:"body",label:t("Nội dung"),type:"textarea",max:400}]} submit={t("Chia sẻ ưu đãi")} onSubmit={async v=>{try{await ctx.act("/deals","POST",v);}catch{}}}/></details></Card> : <LoginGate/>}
      <Pager page={page} onPage={setPage} hasNext={data.meta?.hasNext}/>
    </div>;
    if (path === "/gift") return <GiftShop key={ctx.me?.id} ctx={ctx}/>;
    if (path === "/wallet") return <div className="stack">
      <QueryState q={wallet}><XuBalances wallet={wallet.data} greenAction={<XuExchange ctx={ctx} available={Number(wallet.data?.available || 0)}/>}/><QueryState q={data}><Card title={t("Chờ duyệt (dự kiến)")}><XuAmount amount={data.data?.pending}/><p className="small mute">{t("Khoản này chỉ có thể rút sau khi được duyệt.")}</p></Card></QueryState><Card title={t("Rút tiền về ngân hàng")}><WithdrawalForm ctx={ctx} available={Number(wallet.data?.available || 0)} debt={Number(wallet.data?.debt || 0)}/></Card></QueryState>
      <div className="history-shortcuts"><Link className="history-shortcut" href="/history"><History size={18}/>{t("Xem lịch sử ví")}<ArrowUpRight size={16}/></Link><Link className="history-shortcut" href="/gift"><Gift size={18}/>{t("Đổi quà")}<ArrowUpRight size={16}/></Link></div>
    </div>;
    return <Card><Empty text={t("Không tìm thấy trang.")}/><div className="row"><Link className="btn ghost" href="/">{t("Về tổng quan")}</Link><Link className="btn" href="/link">{t("Lấy link hoàn tiền")}</Link></div></Card>;
}
function CommunityDeal({deal:d,ctx}: {deal:Data;ctx:AppContext}) {
  const {t}=useI18n();
  const [liked,setLiked]=useState(!!d.liked);
  const [busy,setBusy]=useState(false);
  useEffect(()=>setLiked(!!d.liked),[d.liked]);
  return <Card><div className="row between"><div><b>{d.name}</b><p className="small mute">{d.channel} · {date(d.createdAt)}</p></div><button className="btn sm ghost" aria-pressed={liked} disabled={!ctx.me || busy} onClick={async()=>{if(busy)return;setBusy(true);try{await ctx.act("/deals/"+d.id+"/likes/me",liked?"DELETE":"PUT");setLiked(!liked);}catch{}finally{setBusy(false);}}}>{t("Hữu ích")} · {d.likes}</button></div><p className="deal-body">{d.body}</p></Card>;
}
export function OrderTable({ rows }: {
    rows: Data[];
}) {
    const { t } = useI18n();
    return (<div className="stack cashback-orders">

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
            {
                label: t("Hoàn tiền"),
                render: (r) => <>{r.status === "pending" && <span aria-label={t("Chờ duyệt (dự kiến)")}>≈ </span>}<XuAmount amount={r.status === "rejected" ? 0 : Number(r.cashback)}/></>,
            },
            {
                label: t("Trạng thái"),
                render: (r) => <span className={`status ${r.status}`}>{t(r.status === "pending" ? "Chờ duyệt" : r.status === "approved" ? "Đã duyệt" : "Hủy / không được hoàn")}</span>,
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
