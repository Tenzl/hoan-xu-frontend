"use client";
import { useI18n } from "@/lib/i18n";
import { date } from "@/lib/api";
import { bankOptions } from "@/lib/banks";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppContext } from './app-context';
import { Mascot } from "./mascot";
import { LoginGate, QueryState, useData } from './screen-shared';
import { Card, Form, Table } from "./ui";
export function Login({ ctx }: {
    ctx: AppContext;
}) {
    const { t } = useI18n();
    const router = useRouter();
    const [error, setError] = useState("");
    return (<div className="login-wrap">
      <Card>
        <div className="login-intro">
          <Mascot size={72}/>
          <h2>{t("Đăng nhập")}</h2>
          <p className="mute">{t("Sử dụng tài khoản của bạn để tiếp tục.")}</p>
        </div>
        <Form fields={[
            { name: "username", label: t("Tài khoản"), max: 128 },
            { name: "password", label: t("Mật khẩu"), type: "password" },
        ]} submit={t("Đăng nhập")} onSubmit={async (v) => {
            setError("");
            try {
                await ctx.act("/auth/internal/login", "POST", v);
                router.push("/admin");
            }
            catch (e) {
                setError((e as Error).message);
            }
        }}/>
        {error && <p className="err login-error" role="alert">{t(error)}</p>}
        <div className="login-divider"><span>{t("Hoặc")}</span></div>
        {ctx.config.googleConfigured ? (<a className="btn ghost login-google" href="/api/v1/auth/google">
            <span className="google-letter" aria-hidden="true">G</span>
            {t("Tiếp tục với Google")}
          </a>) : (<>
            <button className="btn ghost login-google" disabled>{t("Google chưa sẵn sàng")}</button>
            <p className="small mute login-google-note">{t("Đăng nhập Google sẽ sớm trở lại.")}</p>
          </>)}
      </Card>
    </div>);
}
export function Password({ ctx }: {
    ctx: AppContext;
}) {
    const { t } = useI18n();
    const router = useRouter();
    if (!ctx.me)
        return <LoginGate internal/>;
    return (<Card title={t("Đổi mật khẩu nội bộ")}>
      <p className="mute login-copy">
        {t("Mật khẩu mới từ 12–128 ký tự. Các phiên khác sẽ bị thu hồi.")}
      </p>
      <Form fields={[
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
        ]} submit={t("Đổi mật khẩu")} onSubmit={async (v) => {
            try {
                await ctx.act("/me/password", "PUT", v);
                router.push("/admin");
            }
            catch { }
        }}/>
    </Card>);
}
export function Account({ ctx }: {
    ctx: AppContext;
}) {
    const { t } = useI18n();
    const sessions = useData("/me/sessions", !!ctx.me);
    const router = useRouter();
    if (!ctx.me)
        return <LoginGate />;
    return (<div className="stack">
      <Card title={t("Hồ sơ")}>
        <Form fields={[
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
        ]} initial={{ name: ctx.me.name, ...ctx.me.bankDetails }} submit={t("Lưu hồ sơ")} onSubmit={async (v) => {
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
            }
            catch { }
        }}/>
        {ctx.me.role === "customer" && (<p className="small mute">
            {t("Tên chủ tài khoản phải đúng như hiển thị trên ngân hàng, có thể khác tên hiển thị của bạn. Thông tin này được điền sẵn khi rút tiền; yêu cầu rút đã gửi giữ nguyên thông tin tại thời điểm gửi.")}
          </p>)}
        <p className="mute">
          {ctx.me.email} · {ctx.me.role}
        </p>
        {ctx.me.role !== "customer" && (<Link className="btn ghost" href="/internal/password">
            {t("Đổi mật khẩu")}
          </Link>)}
        <button className="btn ghost" onClick={async () => {
            try {
                await ctx.act("/auth/logout");
                router.push("/login");
            }
            catch { }
        }}>
          <LogOut size={16}/>
          {t("Đăng xuất")}
        </button>
      </Card>
      <QueryState q={sessions}>
        <Card title={t("Phiên đăng nhập")}>
          <Table rows={sessions.data || []} columns={[
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
                render: (r) => (<button className="btn sm ghost" onClick={async () => {
                        try {
                            await ctx.act("/me/sessions/" + r.id, "DELETE");
                        }
                        catch { }
                    }}>
                    {t("Thu hồi")}
                  </button>),
            },
        ]}/>
        </Card>
      </QueryState>
    </div>);
}
