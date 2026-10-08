"use client";
import { useI18n } from "@/lib/i18n";
import { date } from "@/lib/api";
import { bankOptions } from "@/lib/banks";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api, setCSRF, type User } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { clearLoginDraft, useCashbackFlow } from "./cashback-flow";
import { useState } from "react";
import type { AppContext } from './app-context';
import { Mascot } from "./mascot";
import { LoginGate, QueryState, useData } from './screen-shared';
import { Card, Form, Table } from "./ui";
export function Login({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const router = useRouter();
  const search = useSearchParams();
  const flow = useCashbackFlow();
  const qc = useQueryClient();
  const [error, setError] = useState("");
  return <div className="login-wrap"><Card>
    <div className="login-intro"><Mascot size={72}/><h2>{t("Đăng nhập")}</h2></div>
    <Form fields={[{ name: "username", label: t("Tài khoản"), max: 128 }, { name: "password", label: t("Mật khẩu"), type: "password" }]} submit={t("Đăng nhập")} onSubmit={async v => {
      setError("");
      try {
        await api("/auth/internal/login", "POST", v);
        await qc.cancelQueries();
        qc.clear();
        setCSRF("");
        const user = await qc.fetchQuery({ queryKey: ["/me"], queryFn: ({ signal }) => api<User>("/me", "GET", undefined, undefined, signal), staleTime: 0 });
        setCSRF(user.csrfToken);
        router.replace(user.mustChangePassword ? "/internal/password" : "/account");
      }
      catch (e) { setError((e as Error).message); }
    }}/>
    {error && <p className="err login-error" role="alert">{t(error)}</p>}
    <div className="login-divider">{t("Hoặc")}</div>
      {search.get("error") === "google" && <p className="note error-note" role="alert">{t("Chưa đăng nhập được với Google. Vui lòng thử lại.")}</p>}
      {ctx.config.googleConfigured ? <a className="btn login-google" href="/api/v1/auth/google" onClick={flow.prepareLogin}><span className="google-letter" aria-hidden="true">G</span>{t("Tiếp tục với Google")}</a> : <><button className="btn login-google" disabled>{t("Google chưa sẵn sàng")}</button><p className="small mute login-google-note">{t("Đăng nhập Google sẽ sớm trở lại.")}</p></>}
      <Link className="login-back" href="/">{t("Về tổng quan")}</Link>
  </Card></div>;
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
                router.replace("/account");
            }
            catch { }
        }}/>
    </Card>);
}
export function Account({ ctx }: { ctx: AppContext }) {
  const { t } = useI18n();
  const sessions = useData("/me/sessions", !!ctx.me, ctx.me?.id);
  const router = useRouter();
  const qc = useQueryClient();
  if (!ctx.me) return <LoginGate/>;
  const me = ctx.me;
  return <div className="stack account-screen">
    {(me.role === "staff" || me.role === "admin") && <Card title={t("Không gian quản trị")}><Link className="btn" href="/admin">{t("Vào trang quản trị")}</Link></Card>}
    <Card title={t("Hồ sơ")}><p className="mute account-email">{me.email}</p><Form fields={[{ name:"name", label:t("Tên hiển thị"), max:80 }]} initial={{name:me.name}} submit={t("Lưu hồ sơ")} onSubmit={async v => { try{await ctx.act("/me", "PATCH", {name:v.name});}catch{} }}/></Card>
    {me.role === "customer" && <Card title={t("Tài khoản ngân hàng")}>
      <p className="small mute account-bank-note">{t("Thông tin này được điền sẵn khi bạn rút tiền.")}</p>
      <Form fields={[{name:"bank",label:t("Ngân hàng"),searchOptions:bankOptions,placeholder:"Tìm và chọn ngân hàng",max:80,required:false},{name:"account",label:t("Số tài khoản"),max:20,required:false},{name:"holder",label:t("Họ tên đầy đủ hiển thị trên ngân hàng"),uppercase:true,max:80,required:false}]} initial={{...me.bankDetails}} submit={t("Lưu thông tin ngân hàng")} onSubmit={async v => { try{await ctx.act("/me", "PATCH", {name:me.name,bankDetails:{bank:v.bank,account:v.account,holder:v.holder}});}catch{} }}/>
      <p className="small mute">{t("Tên chủ tài khoản phải đúng như hiển thị trên ngân hàng, có thể khác tên hiển thị của bạn. Thông tin này được điền sẵn khi rút tiền; yêu cầu rút đã gửi giữ nguyên thông tin tại thời điểm gửi.")}</p>
    </Card>}
    <Card title={t("Bảo mật")}>
      {me.role !== "customer" && <Link className="btn ghost" href="/internal/password">{t("Đổi mật khẩu")}</Link>}
      <QueryState q={sessions}><h3>{t("Phiên đăng nhập")}</h3><Table rows={sessions.data || []} columns={[{label:t("Bắt đầu"),render:r=>date(r.createdAt)},{label:t("Hết hạn"),render:r=>date(r.expiresAt)},{label:"",render:r=><button className="btn sm ghost" onClick={async()=>{try{await ctx.act("/me/sessions/"+r.id,"DELETE");}catch{}}}>{t("Đăng xuất phiên này")}</button>}]}/></QueryState>
      <button className="btn ghost account-logout" onClick={async()=>{try{await api("/auth/logout","POST");await qc.cancelQueries();qc.clear();setCSRF("");clearLoginDraft();router.replace("/login");}catch(e){ctx.notify((e as Error).message);}}}><LogOut size={16}/>{t("Đăng xuất")}</button>
    </Card>
  </div>;
}
