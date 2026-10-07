"use client";
import {
api,
ApiError,
idempotencyKey,
setCSRF,
type User
} from "@/lib/api";
import { LanguageToggle,useI18n } from "@/lib/i18n";
import { affectedQuery } from "@/lib/invalidation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
Gift,
HelpCircle,
Home,
Link2,
Medal,
LogOut,
Menu,
Moon,
Package,
Sun,
UserRound,
Wallet,
X
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname,useRouter } from "next/navigation";
import { Suspense,useEffect,useLayoutEffect,useRef,useState } from "react";
import { LeaderboardScreen,TopSkeleton } from "./leaderboard";
import { Mascot } from "./mascot";
import { NotificationPopover } from "./notification-popover";
import { adminNav, adminRoute, adminDescriptions, canAdmin } from "./admin-views/admin-navigation";
import {
Card,
Form,
Modal,
type Data
} from "./ui";
const AdminScreen=dynamic(()=>import("./admin").then(module=>module.AdminScreen),{loading:()=> <p role="status">…</p>});

const customerNav = [
  ["/", "Tổng quan", Home],
  ["/link", "Lấy link hoàn tiền", Link2],
  ["/orders", "Đơn hàng", Package],
  ["/wallet", "Ví của tôi", Wallet],
  ["/membership", "Quyền lợi thành viên", Medal],
  ["/discover", "Khám phá", Gift],
] as const;




import { Account,Login,Password } from './account-screens';
import type { AppContext,Dialog } from './app-context';
import { LoginGate,useData } from './screen-shared';
import { clearLoginDraft, useCashbackFlow } from './cashback-flow';
import { LinkWallet } from './link-wallet';
export type { AppContext } from './app-context';
const CustomerScreen=dynamic(()=>import('./customer-screen').then(m=>m.CustomerScreen),{loading:()=> <p role="status">…</p>});
export function HoanXu() {
  const { t } = useI18n();
  const path = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const meQ = useQuery({ queryKey: ["/me"], queryFn: () => api<User>("/me") });
  const cfgQ = useData<Data>("/config");
  const me = meQ.data;
  const config = cfgQ.data || { brand: "Hoàn Xu" };
  const [dark, setDark] = useState(false);
  const [more, setMore] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menu = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState("");
  const [dlg, setDlg] = useState<Dialog | null>(null);
  const pendingReauth = useRef<{ cancel: () => void } | null>(null);
  const operationKeys=useRef(new Map<string,string>());
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const admin = path.startsWith("/admin") || path.startsWith("/internal/");
  const login = path === "/login" || path === "/internal/login";
  const internal = !!me && me.role !== "customer";
  const menuScrollKey = `hoanxu.menu-scroll.${admin ? "admin" : "customer"}.${me?.id || "guest"}`;
  useLayoutEffect(() => {
    if (!menu.current?.clientHeight) return;
    const position = Number(sessionStorage.getItem(menuScrollKey));
    if (Number.isFinite(position) && position >= 0) menu.current.scrollTop = position;
  }, [menuScrollKey, path, more]);
  function rememberMenuScroll() {
    // A hidden mobile drawer has zero geometry; keep its last visible position.
    if (menu.current?.clientHeight) sessionStorage.setItem(menuScrollKey, String(menu.current.scrollTop));
  }
  function closeMenu() {
    rememberMenuScroll();
    setMore(false);
  }
  const showWallet = !admin && !login && ["/", "/link", "/orders", "/wallet", "/membership", "/history", "/checkin", "/gift", "/deal", "/top", "/discover", "/help", "/account"].includes(path);
  const flow = useCashbackFlow();
  const dashboard = useData<Data>("/me/dashboard", showWallet && me?.role === "customer", me?.id);
  useEffect(()=>{operationKeys.current.clear();return ()=>operationKeys.current.clear();},[me?.id]);
  useEffect(() => () => {
    pendingReauth.current?.cancel();
    pendingReauth.current = null;
  }, [path, me?.id]);
  function changeDialog(dialog: Dialog | null) {
    pendingReauth.current?.cancel();
    pendingReauth.current = null;
    setError("");
    setDlg(dialog);
  }
  useEffect(() => {
    setDark(localStorage.getItem("hoanxu.theme") === "dark");
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    document.body.dataset.mode = admin ? "ad" : "kh";
    setMore(false);
    setError("");
  }, [path, admin]);
  useEffect(() => {
    setCSRF(me?.csrfToken || "");
  }, [me]);
  useEffect(() => {
    if (me?.mustChangePassword && path !== "/internal/password")
      router.replace("/internal/password");
  }, [me, path, router]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!more) return;
    const wasScrollLocked = document.body.classList.contains("scroll-locked");
    document.body.classList.add("scroll-locked");
    sidebar.current?.querySelector<HTMLButtonElement>(".sidebar-close")?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // A notification popup handles its own Escape before the drawer closes.
        if (sidebar.current?.querySelector(".notification-popup")) return;
        setMore(false);
      }
      if (event.key === "Tab") {
        const items = Array.from(sidebar.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex="0"]',
        ) || []).filter((item) => item.getClientRects().length > 0);
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const desktopViewport = window.matchMedia("(min-width: 861px)");
    const resize = () => { if (desktopViewport.matches) setMore(false); };
    desktopViewport.addEventListener("change", resize);
    document.addEventListener("keydown", keyboard);
    return () => {
      if (!wasScrollLocked) document.body.classList.remove("scroll-locked");
      document.removeEventListener("keydown", keyboard);
      desktopViewport.removeEventListener("change", resize);
      menuTrigger.current?.focus({ preventScroll: true });
    };
  }, [more]);
  async function act(endpoint: string, method = "POST", body?: unknown) {
    const payload=body instanceof FormData ? crypto.randomUUID() : JSON.stringify(body) || "";
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(payload));
    const signature=endpoint+method+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");
    const keys=operationKeys.current;
    let key = keys.get(signature);
    if (!key) {
      key = idempotencyKey();
      keys.set(signature, key);
      if(keys.size>100)keys.delete(keys.keys().next().value!);
    }
    async function send(signal?: AbortSignal) {
      let v:unknown;
      const deadline=Date.now()+60000;
      for(;;) {
        try {v=await api(endpoint,method,body,key,signal);break;}
        catch(error) {
          if(!(error instanceof ApiError) || error.code!=="LINK_CREATION_IN_PROGRESS" || Date.now()>=deadline || signal?.aborted)throw error;
          await new Promise(resolve=>setTimeout(resolve,1000));
        }
      }
      keys.delete(signature);
      await qc.invalidateQueries({predicate:query=>affectedQuery(endpoint,query.queryKey)});
      setToast(t("Đã cập nhật"));
      setError("");
      return v;
    }
    try {
      return await send();
    } catch (e) {
      const uncertainFinancial = (/^(\/admin\/withdrawals|\/admin\/orders|\/admin\/order-imports|\/admin\/xu-exchange-policies|\/admin\/cashback-policies|\/wallet\/exchanges|\/gift-redemptions|\/admin\/gifts|\/admin\/gift-redemptions|\/admin\/leaderboard-prizes|\/admin\/leaderboard-awards)(\/|$)/.test(endpoint) || /^\/admin\/users\/[^/]+\/orders(?:\/batch)?$/.test(endpoint)) && e instanceof ApiError && e.status >= 500;
      if(e instanceof ApiError && !uncertainFinancial && e.code!=="REAUTH_REQUIRED" && e.code!=="API_UNAVAILABLE" && e.code!=="LINK_CREATION_IN_PROGRESS" && e.code!=="LINK_CREATION_UNCERTAIN")keys.delete(signature);
      const msg = (e as Error).message;
      setError(msg);
      if (e instanceof ApiError && e.code === "REAUTH_REQUIRED") {
        // Keep the original caller pending so its success handling still runs.
        return new Promise((resolve, reject) => {
          pendingReauth.current?.cancel();
          const controller = new AbortController();
          const pending = { cancel: () => { controller.abort(); reject(e); } };
          pendingReauth.current = pending;
          setError("");
          setDlg({
            title: t("Xác thực lại mật khẩu"),
            fields: [{ name: "password", label: t("Mật khẩu"), type: "password" }],
            submit: t("Xác thực"),
            action: async (v) => {
              try {
                if (pendingReauth.current !== pending) return;
                await api("/auth/internal/reauth", "POST", v, undefined, controller.signal);
                if (pendingReauth.current !== pending) return;
                await qc.invalidateQueries({ queryKey: ["/me"] });
                if (pendingReauth.current !== pending) return;
                const refreshed = qc.getQueryData<User>(["/me"]);
                if (refreshed?.csrfToken) setCSRF(refreshed.csrfToken);
                const result = await send(controller.signal);
                if (pendingReauth.current !== pending) return;
                pendingReauth.current = null;
                setDlg(null);
                resolve(result);
              } catch (error) {
                if (pendingReauth.current === pending) setError((error as Error).message);
                throw error;
              }
            },
          });
        });
      }
      throw e;
    }
  }
  const ctx: AppContext = { me, config, act, notify: setToast, dialog: changeDialog };
  const nav = admin
    ? adminNav.filter(
        (n) => canAdmin(me,n[3]),
      )
    : customerNav;
  const customerTitles: Record<string, string> = { "/top": "Bảng xếp hạng", "/deal": "Ưu đãi cộng đồng", "/gift": "Đổi quà", "/checkin": "Điểm danh nhận Xu xanh", "/history": "Lịch sử ví", "/help": "Hướng dẫn & hỗ trợ", "/account": "Tài khoản của tôi", "/internal/login": "Đăng nhập nội bộ" };
  const customerParent = path === "/history" ? "/wallet" : ["/top", "/deal", "/gift", "/checkin"].includes(path) ? "/discover" : path;
  const activePath = admin ? adminRoute(path)?.[0] || path : customerParent;
  const title =
    path === "/top"
      ? t("Bảng xếp hạng")
      : path === "/internal/password"
      ? t("Đổi mật khẩu")
      : path === "/account"
        ? t("Tài khoản của tôi")
        : admin && /^\/admin\/(users|legacy-users)\/[^/]+\/orders$/.test(path) ? t("Hồ sơ & đơn hàng khách") : customerTitles[path] || nav.find((n) => n[0] === activePath)?.[1] || "Hoàn Xu";
  const navLinks = () =>
    nav.map(([href, label, Icon],index) => (
      <div key={href} className="nav-item-group">
      {admin && "4" in nav[index] && nav[index][4] && (index===0 || !("4" in nav[index-1]) || nav[index-1][4]!==nav[index][4]) && <p className="admin-nav-heading">{t(String(nav[index][4]))}</p>}
      <Link
        key={href}
        href={href}
        scroll={false}
        aria-current={activePath === href ? "page" : undefined}
        onClick={closeMenu}
      >
        <Icon size={19} />
        <span>{t(label)}</span>
      </Link>
      </div>
    ));
  const accountControls = (
    <section className="side-account" aria-label={t("Tài khoản và tùy chọn")}>
      <div className="side-account-heading">{t("Tài khoản")}</div>
      {me ? (
        <Link className="side-profile" href="/account" scroll={false} aria-label={me.name} aria-current={path === "/account" ? "page" : undefined} onClick={closeMenu}>
          <span className="avatar" aria-hidden="true">{me.name.slice(0, 1).toUpperCase()}</span>
          <span className="side-profile-copy"><span className="account-link">{me.name}</span><span className="small mute">{internal ? t("Nội bộ") : "Google"}</span></span>
          <UserRound size={16} aria-hidden="true" />
        </Link>
      ) : (
        <Link className="side-profile" href="/login" scroll={false} onClick={closeMenu}>
          <span className="avatar" aria-hidden="true"><UserRound size={18} /></span>
          <span className="account-link">{t("Đăng nhập")}</span>
        </Link>
      )}
      <div className="side-preferences">
        <LanguageToggle />
        <button type="button" className="btn sm ghost icon-button" aria-label={t("Đổi giao diện sáng tối")} aria-pressed={dark} onClick={() => {
          const next = !dark;
          setDark(next);
          localStorage.setItem("hoanxu.theme", next ? "dark" : "light");
        }}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        {!admin && <NotificationPopover key={me?.id || "guest"} user={me} act={act} />}
      </div>
      {me && admin && <button type="button" className="btn sm ghost sidebar-logout" disabled={loggingOut} onClick={async () => {
        setLoggingOut(true);
        try {
          await api("/auth/logout", "POST");
          await qc.cancelQueries();
          qc.clear();
          setCSRF("");
          clearLoginDraft();
          changeDialog(null);
          setMore(false);
          router.replace("/internal/login");
        } catch (e) {
          setError((e as Error).message);
          setMore(false);
        } finally { setLoggingOut(false); }
      }}><LogOut size={16} />{t("Đăng xuất")}</button>}
      {admin && <p className="side-tagline">{t("Không gian quản trị")}</p>}
    </section>
  );
  return (
    <>
      <div className="shell">
        {more && <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setMore(false)} />}
        <aside ref={sidebar} className={"side" + (more ? " is-open" : "")} role={more ? "dialog" : undefined} aria-modal={more ? true : undefined} aria-label={t("Điều hướng")}>
          <div className="side-brand-row">
          <Link className="brand" href={admin ? "/admin" : "/"} scroll={false} onClick={closeMenu}>
            <Mascot size={40} />
            <span>{config.brand}</span>
            {admin && <span className="role">{t("NỘI BỘ")}</span>}
          </Link>
          <button type="button" className="btn sm ghost sidebar-close icon-button" aria-label={t("Đóng điều hướng")} onClick={() => setMore(false)}><X size={18} /></button>
          </div>
          <nav ref={menu} onScroll={rememberMenuScroll} className="nav" aria-label={t("Điều hướng chính")}>
            {navLinks()}
            {!admin && <div className="customer-secondary-nav"><span className="nav-group-label">{t("Hướng dẫn và tài khoản")}</span><Link href="/help" scroll={false} aria-current={path === "/help" ? "page" : undefined} onClick={closeMenu}><HelpCircle size={19}/>{t("Hướng dẫn & hỗ trợ")}</Link><div className="mobile-explore-links">{[["/checkin", "Điểm danh nhận Xu xanh"], ["/gift", "Đổi quà"], ["/deal", "Ưu đãi cộng đồng"], ["/top", "Bảng xếp hạng"]].map(([href,label]) => <Link key={href} href={href} scroll={false} onClick={closeMenu}>{t(label)}</Link>)}</div></div>}
          </nav>
          {accountControls}
        </aside>
        <main id="main" className={!admin ? "customer-page" : undefined} inert={more ? true : undefined}>
          <header className="head">
            <div>
              <h1>{login ? t("Chào mừng đến Hoàn Xu") : t(title)}</h1>
              <p>
                {path === "/top"
                  ? t("Xếp hạng từ tiền hoàn đã duyệt.")
                  : path === "/link"
                  ? t("Tạo link, mở Shopee và mua sản phẩm bạn chọn.")
                  : path === "/membership"
                  ? t("Xem quyền lợi của bạn và mục tiêu lên hạng.")
                  : admin
                  ? t(adminDescriptions[activePath] || "Quản lý tài khoản của bạn.")
                  : t(path === "/orders" ? "Theo dõi đơn mua và link đã tạo." : path === "/wallet" ? "Theo dõi số dư và rút tiền về ngân hàng." : "Mua qua link của bạn để nhận hoàn tiền.")}
              </p>
            </div>
            {me && internal && (
              <span className="pill ok">
                {internal ? t("Nội bộ") : "Google"}
              </span>
            )}
          </header>
          {cfgQ.error && (
            <div className="note" role="alert">
              {t(cfgQ.error.message)}{" "}
              <button className="btn sm ghost" onClick={() => cfgQ.refetch()}>
                {t("Thử lại")}
              </button>
            </div>
          )}
          {error && (
            <div className="note error-note" role="alert">
              {t(error)}
              <button className="btn sm ghost" onClick={() => setError("")}>
                {t("Đóng")}
              </button>
            </div>
          )}
          <div className={!admin ? "customer-workspace" : undefined}>
          <div className="customer-content">
          {login ? (
            <Suspense fallback={<Card><p role="status">{t("Đang tải…")}</p></Card>}><Login ctx={ctx} internal={path === "/internal/login"}/></Suspense>
          ) : path === "/internal/password" ? (
            <Password ctx={ctx} />
          ) : path === "/account" ? (
            <Account ctx={ctx} />
          ) : path === "/top" ? (
            <Suspense fallback={<TopSkeleton />}>
              <LeaderboardScreen me={me} sessionPending={meQ.isPending} />
            </Suspense>
          ) : admin ? (
            <>
              {meQ.isPending ? (
                <Card>{t("Đang kiểm tra phiên…")}</Card>
              ) : !internal ? (
                <LoginGate internal />
              ) : (
                <AdminScreen key={path} path={path} ctx={ctx} />
              )}
            </>
          ) : (
            <CustomerScreen key={path} path={path} ctx={ctx} />
          )}
          </div>
          {showWallet && <LinkWallet key={me?.id || "guest"} ctx={ctx} dashboard={dashboard} check={flow.check} snapshot={flow.result}/>}
          </div>
        </main>
      </div>
      <nav className="tabbar" aria-label={t("Điều hướng nhanh")}>
        {(admin ? nav.filter(([href]) => ["/admin", "/admin/orders", "/admin/withdrawals", "/admin/users"].includes(href)) : nav).slice(0, 4).map(([href, label, Icon]) => (
          <Link
            href={href}
            scroll={false}
            key={href}
            aria-current={activePath === href ? "page" : undefined}
            aria-label={t(label)}
          >
            <Icon size={21} />
            <span>{t(admin ? ({"/admin":"Tổng quan","/admin/orders":"Đơn hàng","/admin/withdrawals":"Rút tiền","/admin/users":"Khách hàng"} as Record<string,string>)[href] || label : href === "/link" ? "Lấy link" : href === "/wallet" ? "Ví" : label)}</span>
          </Link>
        ))}
        <button ref={menuTrigger} aria-expanded={more} aria-haspopup="dialog" onClick={() => setMore(true)}>
          <Menu size={21} />
          <span>{t("Thêm")}</span>
        </button>
      </nav>
      {toast && (
        <div className="toast on" role="status">
          {t(toast)}
        </div>
      )}
      {dlg && (
        <Modal key={dlg.title} title={dlg.title} onClose={() => changeDialog(null)}>
          <Form
            fields={dlg.fields}
            initial={dlg.initial}
            submit={dlg.submit}
            onSubmit={async (v) => {
              try {
                await dlg.action(v);
              } catch {}
            }}
          />
          {error && <p className="err">{t(error)}</p>}
        </Modal>
      )}
    </>
  );
}
