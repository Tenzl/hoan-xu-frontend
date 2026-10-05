"use client";
import { tierName, shareRange } from "@/lib/cashback";
import { useI18n, LanguageToggle } from "@/lib/i18n";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Link2,
  Bookmark,
  Flame,
  Calendar,
  Gift,
  Package,
  Wallet,
  Bell,
  HelpCircle,
  Settings,
  Users,
  Shield,
  Sun,
  Moon,
  LogOut,
  Menu,
  ClipboardList,
  History,
  ArrowUpRight,
  Trophy,
  UserRound,
  X,
} from "lucide-react";
import {
  api,
  ApiError,
  date,
  idempotencyKey,
  money,
  setCSRF,
  type User,
} from "@/lib/api";
import {
  Card,
  Empty,
  Form,
  Modal,
  Status,
  Table,
  type Data,
  type Field,
} from "./ui";
import { bankOptions } from "@/lib/banks";
import { Mascot } from "./mascot";
import { NotificationPopover } from "./notification-popover";
import { ProductCommission } from "./product-commission";
import { WithdrawalForm } from "./withdrawal-form";
import { CashbackLinkBuilder } from "./cashback-link-builder";
import { AdminScreen } from "./admin";
import { LeaderboardScreen, TopSkeleton, xu, type Leaderboard } from "./leaderboard";
const channels = [
  { value: "shopee", label: "Shopee" },
  { value: "lazada", label: "Lazada" },
  { value: "tiktok", label: "TikTok Shop" },
  { value: "tiki", label: "Tiki" },
];
const customerNav = [
  ["/", "Tổng quan", Home],
  ["/link", "Lấy link hoàn tiền", Link2],
  ["/save", "Link đã lưu", Bookmark],
  ["/deal", "Deal cộng đồng", Flame],
  ["/top", "Đua top", Trophy],
  ["/checkin", "Điểm danh", Calendar],
  ["/gift", "Đổi quà", Gift],
  ["/orders", "Đơn hàng", Package],
  ["/wallet", "Ví", Wallet],
  ["/help", "Hỗ trợ", HelpCircle],
] as const;
const adminNav = [
  ["/admin", "Tổng quan", Home, "audit"],
  ["/admin/orders", "Đối soát đơn hàng", Package, "orders"],
  ["/admin/imports", "Nhập báo cáo CSV", ClipboardList, "orders"],
  ["/admin/withdrawals", "Yêu cầu rút tiền", Wallet, "withdrawals"],
  ["/admin/users", "Người dùng", Users, "users"],
  ["/admin/gifts", "Yêu cầu đổi quà", Gift, "gifts"],
  ["/admin/deals", "Deal cộng đồng", Flame, "community"],
  ["/admin/notifications", "Gửi thông báo", Bell, "notifications"],
  ["/admin/settings", "Cài đặt affiliate", Settings, "settings"],
  ["/admin/cookies", "Cài đặt cookie", Shield, "settings"],
  ["/admin/accounts", "Tài khoản nội bộ", Shield, "internal"],
  ["/admin/audit", "Lịch sử quản trị", History, "audit"],
] as const;
type Dialog = {
  title: string;
  fields: Field[];
  initial?: Data;
  submit: string;
  action: (v: Data) => Promise<void>;
};
export type AppContext = {
  me?: User;
  config: Data;
  act: (path: string, method?: string, body?: unknown) => Promise<any>;
  notify: (s: string) => void;
  dialog: (d: Dialog | null) => void;
};
const keys = new Map<string, string>();
function useData<T = Data[]>(path: string, enabled = true) {
  return useQuery<T>({
    queryKey: [path],
    queryFn: () => api<T>(path),
    enabled,
    refetchInterval: path.includes("order-imports") ? 5000 : false,
  });
}
function QueryState({
  q,
  children,
}: {
  q: {
    isPending: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  if (q.isPending)
    return (
      <Card>
        <p role="status" className="mute">
          {t("Đang tải dữ liệu…")}
        </p>
      </Card>
    );
  if (q.error)
    return (
      <Card>
        <p className="err" role="alert">
          {t(q.error.message)}
        </p>
        <button className="btn sm ghost" onClick={() => q.refetch()}>
          {t("Thử lại")}
        </button>
      </Card>
    );
  return <>{children}</>;
}
export function HoanXu() {
  const { t } = useI18n();
  const path = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const meQ = useData<User>("/me");
  const cfgQ = useData<Data>("/config");
  const me = meQ.data;
  const config = cfgQ.data || { brand: "Hoàn Xu" };
  const [dark, setDark] = useState(false);
  const [more, setMore] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState("");
  const [dlg, setDlg] = useState<Dialog | null>(null);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const admin = path.startsWith("/admin") || path.startsWith("/internal/");
  const login = path === "/login" || path === "/internal/login";
  const internal = !!me && me.role !== "customer";
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
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLButtonElement>(".sidebar-close")?.focus();
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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      desktopViewport.removeEventListener("change", resize);
      menuTrigger.current?.focus();
    };
  }, [more]);
  async function act(endpoint: string, method = "POST", body?: unknown) {
    const signature =
      endpoint +
      method +
      (body instanceof FormData ? "upload" : JSON.stringify(body));
    let key = keys.get(signature);
    if (!key) {
      key = idempotencyKey();
      keys.set(signature, key);
    }
    try {
      const v = await api(endpoint, method, body, key);
      keys.delete(signature);
      await qc.invalidateQueries();
      setToast(t("Đã cập nhật"));
      setError("");
      return v;
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      if (e instanceof ApiError && e.code === "REAUTH_REQUIRED") {
        setDlg({
          title: t("Xác thực lại mật khẩu"),
          fields: [
            {
              name: "password",
              label: t("Mật khẩu"),
              type: "password",
            },
          ],
          submit: t("Xác thực"),
          action: async (v) => {
            await api("/auth/internal/reauth", "POST", v);
            await qc.invalidateQueries({ queryKey: ["/me"] });
            setDlg(null);
            setToast(t("Đã xác thực. Thực hiện lại thao tác của bạn."));
          },
        });
      }
      throw e;
    }
  }
  const ctx: AppContext = { me, config, act, notify: setToast, dialog: setDlg };
  const nav = admin
    ? adminNav.filter(
        (n) => me?.role === "admin" || me?.permissions?.includes(n[3]),
      )
    : customerNav;
  const title =
    path === "/top"
      ? t("Đua top Hoàn Xu")
      : path === "/internal/password"
      ? t("Đổi mật khẩu")
      : path === "/account"
        ? t("Tài khoản")
        : nav.find((n) => n[0] === path)?.[1] || "Hoàn Xu";
  const navLinks = () =>
    nav.map(([href, label, Icon]) => (
      <Link
        key={href}
        href={href}
        aria-current={path === href ? "page" : undefined}
        onClick={() => setMore(false)}
      >
        <Icon size={19} />
        <span>{t(label)}</span>
      </Link>
    ));
  const accountControls = (
    <section className="side-account" aria-label={t("Tài khoản và tùy chọn")}>
      <div className="side-account-heading">{t("Tài khoản")}</div>
      {me ? (
        <Link className="side-profile" href="/account" aria-label={me.name} aria-current={path === "/account" ? "page" : undefined} onClick={() => setMore(false)}>
          <span className="avatar" aria-hidden="true">{me.name.slice(0, 1).toUpperCase()}</span>
          <span className="side-profile-copy"><span className="account-link">{me.name}</span><span className="small mute">{internal ? t("Nội bộ") : "Google"}</span></span>
          <UserRound size={16} aria-hidden="true" />
        </Link>
      ) : (
        <Link className="side-profile" href="/login" onClick={() => setMore(false)}>
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
          setDlg(null);
          setMore(false);
          router.replace("/login");
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
          <Link className="brand" href={admin ? "/admin" : "/"}>
            <Mascot size={40} />
            <span>{config.brand}</span>
            {admin && <span className="role">{t("NỘI BỘ")}</span>}
          </Link>
          <button type="button" className="btn sm ghost sidebar-close icon-button" aria-label={t("Đóng điều hướng")} onClick={() => setMore(false)}><X size={18} /></button>
          </div>
          <nav className="nav" aria-label={t("Điều hướng chính")}>
            {navLinks()}
          </nav>
          {accountControls}
        </aside>
        <main id="main" className={path === "/link" ? "cashback-page" : undefined} inert={more ? true : undefined}>
          <header className="head">
            <div>
              <h1>{login ? t("Chào mừng đến Hoàn Xu") : t(title)}</h1>
              <p>
                {path === "/top"
                  ? t("Mỗi đơn được duyệt, thêm một bước lên top")
                  : path === "/link"
                  ? t("Dán link, kiểm tra hoa hồng và mua qua link của bạn.")
                  : admin
                  ? t("Quản lý dữ liệu thật và đối soát minh bạch.")
                  : t("Mỗi đơn hàng, thêm một chút tích lũy.")}
              </p>
            </div>
            {me && (
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
          {login ? (
            <Login ctx={ctx} />
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
        </main>
      </div>
      <nav className="tabbar" aria-label={t("Điều hướng nhanh")}>
        {nav.slice(0, 4).map(([href, label, Icon]) => (
          <Link
            href={href}
            key={href}
            aria-current={path === href ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{t(label)}</span>
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
        <Modal title={dlg.title} onClose={() => setDlg(null)}>
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
function LoginGate({ internal = false }: { internal?: boolean }) {
  const { t } = useI18n();
  return (
    <Card>
      <div className="empty">
        <Mascot size={90} />
        <h3>
          {internal
            ? t("Cần tài khoản nội bộ")
            : t("Đăng nhập để xem dữ liệu cá nhân")}
        </h3>
        <p>
          {internal
            ? t("Tài khoản do quản trị viên cấp.")
            : t("Dùng Google để lưu link, điểm danh và theo dõi hoàn tiền.")}
        </p>
        <p className="small mute">{t("Bấm Đăng nhập ở góc trên bên phải để tiếp tục.")}</p>
      </div>
    </Card>
  );
}
function Login({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <div className="login-wrap">
      <Card>
        <div className="login-intro">
          <Mascot size={72} />
          <h2>{t("Đăng nhập")}</h2>
          <p className="mute">{t("Sử dụng tài khoản của bạn để tiếp tục.")}</p>
        </div>
        <Form
          fields={[
            { name: "username", label: t("Tài khoản"), max: 128 },
            { name: "password", label: t("Mật khẩu"), type: "password" },
          ]}
          submit={t("Đăng nhập")}
          onSubmit={async (v) => {
            setError("");
            try {
              await ctx.act("/auth/internal/login", "POST", v);
              router.push("/admin");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        {error && <p className="err login-error" role="alert">{t(error)}</p>}
        <div className="login-divider"><span>{t("Hoặc")}</span></div>
        {ctx.config.googleConfigured ? (
          <a className="btn ghost login-google" href="/api/v1/auth/google">
            <span className="google-letter" aria-hidden="true">G</span>
            {t("Tiếp tục với Google")}
          </a>
        ) : (
          <>
            <button className="btn ghost login-google" disabled>{t("Google chưa sẵn sàng")}</button>
            <p className="small mute login-google-note">{t("Đăng nhập Google đang được cấu hình.")}</p>
          </>
        )}
      </Card>
    </div>
  );
}
function Password({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const router = useRouter();
  if (!ctx.me) return <LoginGate internal />;
  return (
    <Card title={t("Đổi mật khẩu nội bộ")}>
      <p className="mute login-copy">
        {t("Mật khẩu mới từ 12–128 ký tự. Các phiên khác sẽ bị thu hồi.")}
      </p>
      <Form
        fields={[
          {
            name: "oldPassword",
            label: t("Mật khẩu hiện tại"),
            type: "password",
          },
          {
            name: "password",
            label: t("Mật khẩu mới"),
            type: "password",
            max: 128,
          },
        ]}
        submit={t("Đổi mật khẩu")}
        onSubmit={async (v) => {
          try {
            await ctx.act("/me/password", "PUT", v);
            router.push("/admin");
          } catch {}
        }}
      />
    </Card>
  );
}
function Account({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const sessions = useData("/me/sessions", !!ctx.me);
  const router = useRouter();
  if (!ctx.me) return <LoginGate />;
  return (
    <div className="stack">
      <Card title={t("Hồ sơ")}>
        <Form
          fields={[
            { name: "name", label: t("Tên hiển thị"), max: 80 },
            ...(ctx.me.role === "customer"
              ? [
                  {
                    name: "bank",
                    label: t("Ngân hàng"),
                    searchOptions: bankOptions,
                    placeholder: "Tìm và chọn ngân hàng",
                    max: 80,
                    required: false,
                  },
                  {
                    name: "account",
                    label: t("Số tài khoản"),
                    max: 20,
                    required: false,
                  },
                  {
                    name: "holder",
                    label: t("Họ tên đầy đủ hiển thị trên ngân hàng"),
                    uppercase: true,
                    max: 80,
                    required: false,
                  },
                ]
              : []),
          ]}
          initial={{ name: ctx.me.name, ...ctx.me.bankDetails }}
          submit={t("Lưu hồ sơ")}
          onSubmit={async (v) => {
            try {
              await ctx.act("/me", "PATCH", {
                name: v.name,
                ...(ctx.me?.role === "customer"
                  ? {
                      bankDetails: {
                        bank: v.bank,
                        account: v.account,
                        holder: v.holder,
                      },
                    }
                  : {}),
              });
            } catch {}
          }}
        />
        {ctx.me.role === "customer" && (
          <p className="small mute">
            {t(
              "Tên chủ tài khoản phải đúng như hiển thị trên ngân hàng, có thể khác tên hiển thị của bạn. Thông tin này được điền sẵn khi rút tiền; yêu cầu rút đã gửi giữ nguyên thông tin tại thời điểm gửi.",
            )}
          </p>
        )}
        <p className="mute">
          {ctx.me.email} · {ctx.me.role}
        </p>
        {ctx.me.role !== "customer" && (
          <Link className="btn ghost" href="/internal/password">
            {t("Đổi mật khẩu")}
          </Link>
        )}
        <button
          className="btn ghost"
          onClick={async () => {
            try {
              await ctx.act("/auth/logout");
              router.push("/login");
            } catch {}
          }}
        >
          <LogOut size={16} />
          {t("Đăng xuất")}
        </button>
      </Card>
      <QueryState q={sessions}>
        <Card title={t("Phiên đăng nhập")}>
          <Table
            rows={sessions.data || []}
            columns={[
              {
                label: t("Bắt đầu"),
                render: (r) => date(r.createdAt),
              },
              {
                label: t("Hết hạn"),
                render: (r) => date(r.expiresAt),
              },
              {
                label: "",
                render: (r) => (
                  <button
                    className="btn sm ghost"
                    onClick={async () => {
                      try {
                        await ctx.act("/me/sessions/" + r.id, "DELETE");
                      } catch {}
                    }}
                  >
                    {t("Thu hồi")}
                  </button>
                ),
              },
            ]}
          />
        </Card>
      </QueryState>
    </div>
  );
}
function Stats({ items }: { items: [string, unknown, boolean?][] }) {
  const { t } = useI18n();
  return (
    <div className="grid4">
      {items.map(([label, value, currency]) => (
        <div className="card stat" key={t(label)}>
          <span className="small mute">{t(label)}</span>
          <b className="num">{currency ? money(value) : String(value ?? 0)}</b>
        </div>
      ))}
    </div>
  );
}
function Pager({
  page,
  onPage,
}: {
  page: number;
  onPage: (n: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="row between pager">
      <button
        className="btn sm ghost"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        {t("← Trước")}
      </button>
      <span className="small mute">
        {t("Trang")} {page}
      </span>
      <button className="btn sm ghost" onClick={() => onPage(page + 1)}>
        {t("Tiếp →")}
      </button>
    </div>
  );
}
function LinkBox({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const [result, setResult] = useState<Data | null>(null);
  const channelQ = useData("/affiliate-channels");
  const [productURL, setProductURL] = useState("");
  const membership = useData<Data>("/me/dashboard",ctx.me?.role === "customer");
  return (
    <section className="ticket">
      <div className="ticket-main">
        <h2>{t("Dán link sản phẩm, nhận link hoàn tiền")}</h2>
        <p className="mute small">
          {t("Link gắn tracking riêng cho tài khoản của bạn.")}
        </p>
        {ctx.me?.role === "customer" && membership.data?.membership && <p className="small">{t(tierName(membership.data.membership.tierCode))} · {t("Khoảng chia dự kiến")}: {shareRange(membership.data.membership.minSharePercent,membership.data.membership.maxSharePercent)}</p>}
        <Form
          fields={[
            {
              name: "url",
              label: t("Link sản phẩm Shopee"),
              type: "url",
              placeholder: "https://shopee.vn/...",
              onChange: (value) => {
                setProductURL(value);
                setResult(null);
              },
            },
          ]}
          submit={t("Lấy link hoàn tiền")}
          afterFields={<ProductCommission url={productURL} />}
          onSubmit={async (v) => {
            if (!ctx.me) {
              ctx.notify(t("Đăng nhập Google để tạo link."));
              return;
            }
            try {
              setResult(await ctx.act("/affiliate-links", "POST", v));
            } catch {}
          }}
        />
        {result && (
          <div className="out">
            <b>{t("Link của bạn đã sẵn sàng")}</b>
            <code>{result.affiliateUrl}</code>
            <p className="small mute">Tracking: {result.trackingCode}</p>
            <p className="small mute">{t(tierName(result.tierCode))} · {shareRange(result.minSharePercent,result.maxSharePercent)}</p>
            <div className="row wrap">
              <button
                className="btn sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result.affiliateUrl);
                    ctx.notify(t("Đã sao chép"));
                  } catch {
                    ctx.notify(t("Chọn link để sao chép thủ công"));
                  }
                }}
              >
                {t("Sao chép")}
              </button>
              <a
                className="btn sm ghost"
                href={result.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("Mở để mua")}
                <ArrowUpRight size={14} />
              </a>
              <button
                className="btn sm ghost"
                onClick={async () => {
                  try {
                    await ctx.act("/affiliate-links/" + result.id, "PATCH", {
                      saved: true,
                    });
                  } catch {}
                }}
              >
                {t("Lưu link")}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="ticket-stub">
        <Mascot size={88} />
        <div>
          <b>{t("Tích lũy")}</b>
          <span>
            {t("Mức hoàn phụ thuộc sản phẩm và hoa hồng được sàn duyệt.")}
          </span>
        </div>
      </div>
      <div className="ticket-channels full">
        {(channelQ.data || []).map((c) => (
          <span key={c.id}>
            {c.name} <Status value={c.status} />
          </span>
        ))}
      </div>
    </section>
  );
}
function CustomerScreen({ path, ctx }: { path: string; ctx: AppContext }) {
  const { t, language } = useI18n();
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("pending");
  const customer = ctx.me?.role === "customer";
  let endpoint = "";
  if (path === "/") endpoint = "/me/dashboard";
  if (path === "/orders") endpoint = "/orders?status=" + tab + "&page=" + page;
  if (path === "/save" || path === "/link")
    endpoint =
      "/affiliate-links?" +
      (path === "/save" ? "saved=true&" : "") +
      "page=" +
      page;
  if (path === "/wallet") endpoint = "/withdrawals?page=" + page;
  if (path === "/checkin") endpoint = "/checkins";
  if (path === "/gift") endpoint = "/gift-redemptions?page=" + page;
  if (path === "/deal") endpoint = "/deals?page=" + page;
  const data = useData<any>(
    endpoint,
    !!endpoint && (customer || path === "/deal"),
  );
  const board = useData<Leaderboard>("/leaderboards?period=month", path === "/");
  const coins = useData<Data>(
    "/checkins",
    customer && (path === "/gift" || path === "/wallet"),
  );
  const coinLog = useData(
    "/wallet/transactions",
    customer && (path === "/checkin" || path === "/gift"),
  );
  const legacyCoins = useData("/coins/transactions", customer && path === "/checkin");
  const gifts = useData("/gifts", path === "/gift");
  const wallet = useData<Data>("/wallet", customer && path === "/wallet");
  const txs = useData("/wallet/transactions", customer && path === "/wallet");
  const recent = useData("/orders?perPage=4", customer && path === "/");
  if (path === "/help")
    return (
      <div className="stack">
        <Card title={t("Câu hỏi thường gặp")}>
          {(ctx.config.faq || []).map((item: Data, index: number) => (
            <details key={index}>
              <summary>{t(item.question)}</summary>
              <p>{t(item.answer)}</p>
            </details>
          ))}
          {!ctx.config.faq?.length && (
            <p className="mute">{t("Nội dung hỗ trợ đang được cập nhật.")}</p>
          )}
        </Card>
        <Card>
          <div className="row">
            <Mascot size={90} />
            <div>
              <h2>{t("Cần kiểm tra đơn của bạn?")}</h2>
              {ctx.config.supportEmail ? (
                <a href={"mailto:" + ctx.config.supportEmail}>
                  {ctx.config.supportEmail}
                </a>
              ) : (
                <p className="mute">
                  {t("Địa chỉ hỗ trợ chưa được cấu hình.")}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  if (path === "/" && !customer)
    return (
      <div className="stack">
        <LinkBox ctx={ctx} />
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
      </div>
    );
  if (path === "/link")
    return (
      <div className="stack link-screen">
        <CashbackLinkBuilder ctx={ctx} />
        {customer && (
          <QueryState q={data}>
            <LinkList rows={data.data || []} ctx={ctx} creationHistory />
          </QueryState>
        )}
      </div>
    );
  if (!customer && path !== "/deal") return <LoginGate />;
  if (path === "/")
    return (
      <QueryState q={data}>
        <div className="stack">
          <LinkBox ctx={ctx} />
          <Stats
            items={[
              [t("Chờ duyệt (dự kiến)"), data.data?.pending, true],
              [t("Đã duyệt"), data.data?.approved, true],
              [t("Có thể rút"), data.data?.available, true],
              [t("Tổng đơn"), data.data?.totalOrders],
            ]}
          />
          <Card>
            <div className="row">
              <Mascot size={80} />
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
                  <p className="small mute">{t("Khoảng chia dự kiến")}: {shareRange(data.data.membership.minSharePercent,data.data.membership.maxSharePercent)}</p>
                  <p className="small mute">{data.data.membership.nextTier ? <>{t("Còn")} {data.data.membership.ordersToNext} {t("đơn để lên hạng")} {t(tierName(data.data.membership.nextTier.tierCode))}</> : t("Hạng cao nhất")}</p>
                </>}
              </div>
            </div>
          </Card>
          <div className="grid2 one">
            <Card title={t("Đơn gần đây")}>
              <OrderTable rows={recent.data || []} />
            </Card>
            <Card title={t("Top Hoàn Xu tháng này")}>
              <Table
                rows={(board.data?.items || []).slice(0, 5)}
                columns={[
                  { label: t("Thành viên"), render: (r) => r.name },
                  {
                    label: t("Hoàn Xu"),
                    render: (r) => xu(r.xu, language),
                  },
                  { label: t("Đơn"), render: (r) => r.orders },
                ]}
              />
              {board.error && <p className="err">{t(board.error.message)}</p>}
              <Link className="btn sm ghost" href="/top?period=month">{t("Xem cuộc đua")}<ArrowUpRight size={15} /></Link>
            </Card>
          </div>
        </div>
      </QueryState>
    );
  if (path === "/orders")
    return (
      <div className="stack">
        <div className="tabs">
          {["pending", "approved", "rejected"].map((t) => (
            <button
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t);
                setPage(1);
              }}
            >
              <Status value={t} />
            </button>
          ))}
        </div>
        <QueryState q={data}>
          <Card>
            <OrderTable rows={data.data || []} />
            <Pager page={page} onPage={setPage} />
          </Card>
        </QueryState>
      </div>
    );
  if (path === "/save")
    return (
      <QueryState q={data}>
        <div className="stack">
          <LinkList rows={data.data || []} ctx={ctx} />
          <Pager page={page} onPage={setPage} />
        </div>
      </QueryState>
    );
  if (path === "/deal")
    return (
      <div className="stack">
        {customer ? (
          <Card title={t("Chia sẻ deal bạn tìm được")}>
            <Form
              fields={[
                { name: "channel", label: t("Kênh"), options: channels },
                {
                  name: "body",
                  label: t("Nội dung"),
                  type: "textarea",
                  max: 400,
                },
              ]}
              submit={t("Đăng deal")}
              onSubmit={async (v) => {
                try {
                  await ctx.act("/deals", "POST", v);
                } catch {}
              }}
            />
          </Card>
        ) : (
          <LoginGate />
        )}
        <QueryState q={data}>
          {!(data.data || []).length ? (
            <Card>
              <Empty text={t("Chưa có deal cộng đồng.")} />
            </Card>
          ) : (
            (data.data || []).map((d: Data) => (
              <Card key={d.id}>
                <div className="row between">
                  <div>
                    <b>{d.name}</b>
                    <p className="small mute">
                      {d.channel} · {date(d.createdAt)}
                    </p>
                  </div>
                  <button
                    className="btn sm ghost"
                    disabled={!customer}
                    onClick={async () => {
                      try {
                        await ctx.act("/deals/" + d.id + "/likes/me", "PUT");
                      } catch {}
                    }}
                  >
                    {t("Hữu ích ·")}
                    {d.likes}
                  </button>
                </div>
                <p className="deal-body">{d.body}</p>
                {customer && (
                  <button
                    className="btn sm ghost"
                    onClick={async () => {
                      try {
                        await ctx.act("/deals/" + d.id + "/likes/me", "DELETE");
                      } catch {}
                    }}
                  >
                    {t("Bỏ hữu ích")}
                  </button>
                )}
              </Card>
            ))
          )}
        </QueryState>
        <Pager page={page} onPage={setPage} />
      </div>
    );
  if (path === "/checkin")
    return (
      <QueryState q={data}>
        <div className="stack">
          <Card>
            <div className="streak">
              <Flame className="flame lit" size={100} color="var(--xu)" />
              <div>
                <h2>
                  {data.data?.checkedIn
                    ? t("Đã giữ lửa hôm nay")
                    : t("Giữ lửa điểm danh")}
                </h2>
                <p className="mute">
                  {t("Chuỗi")}
                  {data.data?.streak || 0}
                  {t("ngày · Kỷ lục")} {data.data?.best || 0}
                  {t("ngày")}
                </p>
                <p className="num">{data.data?.available || 0} Xu</p>
                <button
                  className="btn xu"
                  disabled={data.data?.checkedIn}
                  onClick={async () => {
                    try {
                      await ctx.act("/checkins");
                    } catch {}
                  }}
                >
                  {data.data?.checkedIn
                    ? t("Đã điểm danh")
                    : t("Điểm danh +300 Xu")}
                </button>
              </div>
            </div>
          </Card>
          <Card title={t("Thưởng mốc chuỗi")}>
            <div className="miles">
              {[
                [3, 600],
                [7, 1500],
                [14, 3000],
                [30, 9000],
              ].map(([d, b]) => (
                <div
                  className={
                    "mile " + (Number(data.data?.streak) >= d ? "got" : "")
                  }
                  key={d}
                >
                  <Flame color="var(--xu)" />
                  <b>
                    {d}
                    {t("ngày")}
                  </b>
                  <span>+{b} Xu</span>
                </div>
              ))}
            </div>
            <p className="small mute">
              {t(
                "Bỏ một ngày bắt đầu lại chuỗi. Mốc được thưởng một lần trong mỗi chuỗi.",
              )}
            </p>
          </Card>
          <Card title={t("Lịch sử xu")}>
            <Table
              rows={coinLog.data || []}
              columns={[
                { label: t("Ngày"), render: (r) => date(r.createdAt) },
                { label: t("Nội dung"), render: (r) => t(r.description) },
                {
                  label: t("Xu"),
                  render: (r) => (r.amount > 0 ? "+" : "") + r.amount,
                },
              ]}
            />
          </Card>
          {(legacyCoins.data?.length || 0) > 0 && <Card title={t("Xu điểm danh (đơn vị cũ)")}>
            <p className="small mute">{t("Lịch sử trước khi gộp ví. Số Xu còn lại đã chuyển ×300; không cộng lại các giao dịch này.")}</p>
            <Table rows={legacyCoins.data || []} columns={[
              { label: t("Ngày"), render: r => date(r.createdAt) },
              { label: t("Nội dung"), render: r => t(r.description) },
              { label: t("Xu điểm danh (đơn vị cũ)"), render: r => r.amount },
              { label: t("Giá trị tương đương"), render: r => r.equivalentXu + " Xu" },
            ]} />
          </Card>}
        </div>
      </QueryState>
    );
  if (path === "/gift")
    return (
      <div className="stack">
        <Stats items={[[t("Xu có thể dùng"), coins.data?.available]]} />
        <p className="note">{t("Hoàn tiền và Xu điểm danh cùng tích lũy vào ví. 1 Xu = 1đ.")}</p>
        <QueryState q={gifts}>
          <Card title="Voucher">
            <ul className="list">
              {(gifts.data || []).map((g) => (
                <li key={g.id}>
                  <span className={"logo " + g.channel}>
                    {g.channel.slice(0, 2)}
                  </span>
                  <div className="grow">
                    <b>{g.name}</b>
                    <p className="small mute">
                      {g.costXu}
                      {t("xu · Còn")}
                      {g.stock}
                      {t("mã")}
                    </p>
                  </div>
                  <button
                    className="btn sm"
                    disabled={
                      g.stock < 1 || Number(coins.data?.available) < g.costXu
                    }
                    onClick={async () => {
                      try {
                        await ctx.act("/gift-redemptions", "POST", {
                          giftId: g.id,
                        });
                      } catch {}
                    }}
                  >
                    {t("Đổi voucher")}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </QueryState>
        <QueryState q={data}>
          <Card title={t("Yêu cầu đổi quà")}>
            <Table
              rows={data.data || []}
              columns={[
                { label: t("Ngày"), render: (r) => date(r.createdAt) },
                { label: t("Quà"), render: (r) => r.giftName },
                { label: t("Xu"), render: (r) => <>{r.costXu} Xu{r.costUnit === "legacy_coin" && <p className="small mute">{r.legacyCost} · {t("Xu điểm danh (đơn vị cũ)")}</p>}</> },
                {
                  label: t("Trạng thái"),
                  render: (r) => <Status value={r.status} />,
                },
                {
                  label: t("Mã / lý do"),
                  render: (r) => r.code || r.reason || t("Chờ cấp mã"),
                },
              ]}
            />
          </Card>
        </QueryState>
      </div>
    );
  if (path === "/wallet")
    return (
      <div className="stack">
        <QueryState q={wallet}>
          <Stats
            items={[
              [t("Có thể rút"), wallet.data?.available, true],
              [t("Đang tạm giữ"), Number(wallet.data?.held || 0) + Number(wallet.data?.giftHeld || 0), true],
              [t("Khoản thiếu"), wallet.data?.debt, true],
            ]}
          />
        </QueryState>
        <Card title={t("Rút tiền về ngân hàng")}>
          <WithdrawalForm ctx={ctx} available={Number(wallet.data?.available || 0)} debt={Number(wallet.data?.debt || 0)} />
        </Card>
        <QueryState q={data}>
          <Card title={t("Lịch sử rút tiền")}>
            <Table
              rows={data.data || []}
              columns={[
                { label: t("Ngày"), render: (r) => date(r.createdAt) },
                {
                  label: t("Ngân hàng"),
                  render: (r) => r.bank + " · " + r.account,
                },
                { label: t("Tiền"), render: (r) => money(r.amount) },
                {
                  label: t("Trạng thái"),
                  render: (r) => <Status value={r.status} />,
                },
                { label: t("Lý do"), render: (r) => r.reason },
              ]}
            />
          </Card>
        </QueryState>
        <QueryState q={txs}>
          <Card title={t("Lịch sử ví")}>
            <Table
              rows={txs.data || []}
              columns={[
                { label: t("Ngày"), render: (r) => date(r.createdAt) },
                { label: t("Nội dung"), render: (r) => t(r.description) },
                {
                  label: t("Biến động khả dụng"),
                  render: (r) => money(r.amount),
                },
              ]}
            />
          </Card>
        </QueryState>
      </div>
    );
  return (
    <Card>
      <Empty text={t("Không tìm thấy trang.")} />
      <Link href="/">{t("Về tổng quan")}</Link>
    </Card>
  );
}
function LinkList({ rows, ctx, creationHistory = false }: { rows: Data[]; ctx: AppContext; creationHistory?: boolean }) {
  const { t } = useI18n();
  return (
    <Card title={t("Link của bạn")}>
      {creationHistory && !rows.length ? <div className="link-history-empty"><Bookmark size={20} aria-hidden="true" /><div><h3>{t("Bạn chưa tạo link nào")}</h3><p>{t("Link đã tạo sẽ nằm ở đây để bạn mở lại hoặc lưu cho lần mua sau.")}</p></div></div> :
      <Table
        rows={rows}
        scrollLabel={creationHistory ? t("Link của bạn") : undefined}
        columns={[
          {
            label: t("Sản phẩm"),
            render: (r) => (
              <div className="clip link-cell">
                {r.originalUrl}
                <p className="small mute">
                  {r.trackingCode} · {date(r.createdAt)}
                </p>
                <p className="small mute">{t(tierName(r.tierCode))} · {shareRange(r.minSharePercent,r.maxSharePercent)}</p>
              </div>
            ),
          },
          {
            label: "",
            render: (r) => (
              <div className="row wrap">
                <button
                  className="btn sm ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(r.affiliateUrl);
                      ctx.notify(t("Đã sao chép"));
                    } catch {
                      ctx.notify(t("Không sao chép được"));
                    }
                  }}
                >
                  {t("Sao chép")}
                </button>
                <a
                  className="btn sm ghost"
                  href={r.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("Mở")}
                </a>
                <button
                  className="btn sm ghost"
                  onClick={async () => {
                    try {
                      await ctx.act("/affiliate-links/" + r.id, "PATCH", {
                        saved: !r.saved,
                      });
                    } catch {}
                  }}
                >
                  {r.saved ? t("Bỏ lưu") : t("Lưu")}
                </button>
              </div>
            ),
          },
        ]}
      />}
    </Card>
  );
}
function OrderTable({ rows }: { rows: Data[] }) {
  const { t } = useI18n();
  return (
    <div className="stack cashback-orders">
    <p className="small mute">{t("Tiền hoàn đang chờ chưa phải số dư có thể rút. Tỷ lệ áp dụng trên hoa hồng sàn thực nhận.")}</p>
    <Table
      scrollLabel={t("Bảng đơn hàng")}
      rows={rows}
      columns={[
        {
          label: t("Sản phẩm"),
          render: (r) => (
            <>
              <b>{r.productName}</b>
              <p className="small mute">
                {r.channel} · {date(r.orderedAt)}
              </p>
            </>
          ),
        },
        { label: t("Giá trị"), render: (r) => money(r.value) },
        { label: t("Tỷ lệ đã chọn"), render: (r) => <>{r.sharePercent == null ? "—" : `${r.sharePercent}%`}<p className="small mute">{t(tierName(r.tierCode))}</p></> },
        {
          label: t("Hoàn tiền"),
          render: (r) =>
            r.status === "rejected"
              ? t("0đ")
              : (r.status === "pending" ? "≈ " : "") + money(r.cashback),
        },
        {
          label: t("Trạng thái"),
          render: (r) => <Status value={r.status} />,
        },
      ]}
    />
    </div>
  );
}
