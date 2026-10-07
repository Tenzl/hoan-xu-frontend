"use client";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { components } from "@/lib/api-schema";
import { Card, Table } from "../ui";
import { AdminPanel, AdminFeedback, AdminEmpty, useAdminFormId } from "./admin-ui";
import type { AdminViewProps } from "./types";

type Permission=NonNullable<components["schemas"]["InternalAccountInput"]["permissions"]>[number];
type Account={id:string;username:string;name:string;role:"staff"|"admin";permissions:Permission[];blocked:boolean;mustChangePassword:boolean};
export const permissionOptions: readonly {value:Permission;label:string;description:string}[]=[
 {value:"orders",label:"Đơn hàng & nhập báo cáo",description:"Xem, đối soát, thêm đơn và nhập báo cáo sàn."},
 {value:"withdrawals",label:"Xử lý rút tiền",description:"Tiếp nhận, từ chối và ghi nhận chuyển khoản cho khách."},
 {value:"users",label:"Quản lý khách hàng",description:"Tra cứu khách và quản lý khách từ hệ thống cũ."},
 {value:"gifts",label:"Quà tặng & thưởng tuần",description:"Quản lý tồn kho, đổi quà, chương trình tuần và trao quà."},
 {value:"community",label:"Kiểm duyệt cộng đồng",description:"Xem, ẩn, hiện và xóa bài đăng cộng đồng."},
 {value:"notifications",label:"Gửi thông báo",description:"Soạn thông báo cho một khách hoặc tất cả khách hàng."},
 {value:"settings",label:"Chính sách & kết nối Shopee",description:"Chỉnh chính sách Xu, nội dung hỗ trợ và cấu hình Shopee."},
 {value:"audit",label:"Báo cáo tài chính & nhật ký",description:"Xem số liệu tài chính, lịch sử quản trị và kiểm tra số dư."},
];
type Panel={kind:"create"|"permissions"|"password"|"status";account?:Account};

export function AdminAccounts({ctx,rowData,pager}:AdminViewProps) {
 const {t}=useI18n();const id=useAdminFormId();
 const [panel,setPanel]=useState<Panel|null>(null);const [permissions,setPermissions]=useState<Permission[]>([]);
 const [role,setRole]=useState<"staff"|"admin">("staff");const [dirty,setDirty]=useState(false);
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
 function open(kind:Panel["kind"],account?:Account){setPanel({kind,account});setPermissions(account?.permissions||[]);setRole(account?.role||"staff");setDirty(false);setError("");}
 const title=panel?.kind==="create"?t("Tạo tài khoản nhân viên"):panel?.kind==="permissions"?t("Chỉnh quyền"):panel?.kind==="password"?t("Đặt lại mật khẩu"):t(panel?.account?.blocked?"Mở khóa tài khoản":"Khóa tài khoản");
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy || !panel)return;setBusy(true);setError("");
  const form=new FormData(event.currentTarget);const account=panel.account;
  try{
   if(panel.kind==="create") await ctx.act("/admin/internal-accounts","POST",{username:String(form.get("username")||"").trim(),name:String(form.get("name")||"").trim(),password:String(form.get("password")||""),role,permissions:role==="staff"?permissions:[]});
   if(panel.kind==="permissions")await ctx.act("/admin/internal-accounts/"+account!.id+"/permissions","PUT",{permissions});
   if(panel.kind==="password")await ctx.act("/admin/internal-accounts/"+account!.id+"/reset-password","POST",{password:String(form.get("password")||"")});
   if(panel.kind==="status")await ctx.act("/admin/internal-accounts/"+account!.id+"/status","PATCH",{blocked:!account!.blocked});
   setDirty(false);setPanel(null);setMessage(t("Đã cập nhật tài khoản."));
  }catch(e){setError(t((e as Error).message));}finally{setBusy(false);}
 }
 return <div className="stack">
  <AdminFeedback message={message}/>
  <Card><div className="admin-toolbar"><div><h2>{t("Danh sách tài khoản")}</h2><p className="small mute">{t("Quản trị viên có toàn quyền. Nhân viên chỉ dùng các chức năng được chọn.")}</p></div><button className="btn" onClick={()=>open("create")}>{t("Tạo tài khoản")}</button></div>
   {!rowData.length?<AdminEmpty title={t("Chưa có tài khoản trong danh sách")}>{t("Tạo tài khoản để giao công việc cho nhân viên.")}</AdminEmpty>:<Table responsive scrollLabel={t("Danh sách tài khoản")} rows={rowData} columns={[
    {label:t("Tài khoản"),render:r=><><b>{r.name}</b><p className="small mute">{r.username}</p></>},
    {label:t("Vai trò"),render:r=>t(r.role==="admin"?"Quản trị viên":"Nhân viên")},
    {label:t("Quyền truy cập"),render:r=>r.role==="admin"?t("Có toàn quyền"):r.permissions?.length?<div className="admin-permission-summary">{r.permissions.map((p:Permission)=><span key={p}>{t(permissionOptions.find(o=>o.value===p)?.label||p)}</span>)}</div>:t("Chưa cấp quyền")},
    {label:t("Trạng thái"),render:r=><span className={"pill "+(r.blocked?"no":r.mustChangePassword?"wait":"ok")}>{t(r.blocked?"Đã khóa":r.mustChangePassword?"Cần đổi mật khẩu":"Hoạt động")}</span>},
    {label:t("Thao tác"),render:r=>r.id===ctx.me?.id?<span className="small mute">{t("Tài khoản của tôi")}</span>:<button className="btn sm ghost" onClick={()=>open(r.role==="staff"?"permissions":"password",r as Account)}>{t("Quản lý")}</button>},
   ]}/>}
   {pager}
  </Card>
  {panel && <AdminPanel title={title} dirty={dirty&&!busy} onClose={()=>{if(!busy)setPanel(null);}}>
   <form onSubmit={event=>void submit(event)} onChange={()=>setDirty(true)} className="stack">
    <fieldset disabled={busy}>
     {panel.account && <section className="admin-form-section"><h3>{panel.account.name}</h3><p className="small mute">{panel.account.username}</p><div className="admin-tabs" role="group" aria-label={t("Quản lý tài khoản")}>
      {panel.account.role==="staff" && <button type="button" aria-pressed={panel.kind==="permissions"} onClick={()=>{if(dirty){setError(t("Lưu hoặc đóng biểu mẫu trước khi chuyển thao tác."));return;}open("permissions",panel.account);}}>{t("Chỉnh quyền")}</button>}
      <button type="button" aria-pressed={panel.kind==="password"} onClick={()=>{if(dirty){setError(t("Lưu hoặc đóng biểu mẫu trước khi chuyển thao tác."));return;}open("password",panel.account);}}>{t("Đặt lại mật khẩu")}</button>
      <button type="button" aria-pressed={panel.kind==="status"} onClick={()=>{if(dirty){setError(t("Lưu hoặc đóng biểu mẫu trước khi chuyển thao tác."));return;}open("status",panel.account);}}>{t(panel.account.blocked?"Mở khóa":"Khóa tài khoản")}</button>
     </div></section>}
     {panel.kind==="create" && <section className="admin-form-section"><h3>{t("Thông tin đăng nhập")}</h3>
      <label className="field" htmlFor={id+"username"}>{t("Tên đăng nhập")}<input id={id+"username"} className="inp" name="username" required minLength={3} maxLength={40} pattern="[a-zA-Z0-9_.-]+" autoComplete="off"/></label>
      <p className="small mute">{t("Từ 3–40 ký tự, gồm chữ, số và dấu . _ -")}</p>
      <label className="field" htmlFor={id+"name"}>{t("Tên hiển thị")}<input id={id+"name"} className="inp" name="name" required maxLength={80}/></label>
      <div className="field"><label htmlFor={id+"role"}>{t("Vai trò")}</label><select id={id+"role"} className="inp" value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="staff">{t("Nhân viên")}</option><option value="admin">{t("Quản trị viên")}</option></select></div>
     </section>}
     {(panel.kind==="create"||panel.kind==="password") && <section className="admin-form-section">
      <label className="field" htmlFor={id+"password"}>{t("Mật khẩu tạm")}<input id={id+"password"} name="password" className="inp" type="password" required minLength={12} maxLength={128} autoComplete="new-password"/></label>
      <p className="small mute">{t("Từ 12–128 ký tự. Người nhận phải đổi mật khẩu ở lần đăng nhập tiếp theo.")}</p>
     </section>}
     {(panel.kind==="create"||panel.kind==="permissions") && <section className="admin-form-section"><h3>{t("Quyền truy cập")}</h3>
      {role==="admin"?<p className="note">{t("Có toàn quyền")}</p>:<>
       <div className="admin-permission-list">{permissionOptions.map(option=><label key={option.value} className="admin-permission-option"><input type="checkbox" aria-label={t(option.label)} checked={permissions.includes(option.value)} onChange={e=>setPermissions(old=>e.target.checked?permissionOptions.filter(o=>old.includes(o.value)||o.value===option.value).map(o=>o.value):old.filter(p=>p!==option.value))}/><span>{t(option.label)}<small>{t(option.description)}</small></span></label>)}</div>
       <p className="small mute">{t("Xem đơn hàng của khách cần cả quyền Quản lý khách hàng và Đơn hàng & nhập báo cáo.")}</p>
       {!permissions.length && <p className="note">{t("Chưa chọn quyền. Tài khoản sẽ chưa được giao chức năng.")}</p>}
      </>}
     </section>}
     {panel.kind==="status" && <p className="note">{t(panel.account?.blocked?"Mở khóa cho phép tài khoản đăng nhập lại với quyền hiện có.":"Khóa sẽ ngăn đăng nhập và thu hồi các phiên của tài khoản này.")}</p>}
     {panel.kind!=="create" && <p className="small mute">{t("Thao tác này thu hồi các phiên đăng nhập của tài khoản được chọn.")}</p>}
     <div className="admin-form-actions"><button type="submit" className={"btn "+(panel.kind==="status"&&!panel.account?.blocked?"danger":"")}>{t(busy?"Đang xử lý…":panel.kind==="create"?"Tạo tài khoản":panel.kind==="permissions"?"Lưu quyền":panel.kind==="password"?"Đặt lại mật khẩu":panel.account?.blocked?"Mở khóa tài khoản":"Khóa tài khoản")}</button></div>
    </fieldset>
    <AdminFeedback error={error}/>
   </form>
  </AdminPanel>}
 </div>;
}
