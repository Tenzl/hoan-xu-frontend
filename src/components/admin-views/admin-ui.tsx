"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { Modal } from "../ui";

export function AdminTabs({label,value,onChange,options}: {label:string;value:string;onChange:(value:string)=>void;options:readonly {value:string;label:string}[]}) {
 const {t}=useI18n();
 return <div className="admin-tabs" role="group" aria-label={t(label)}>{options.map(option=><button type="button" key={option.value} aria-pressed={value===option.value} onClick={()=>onChange(option.value)}>{t(option.label)}</button>)}</div>;
}
export function AdminPanel({title,children,onClose,dirty=false}: {title:string;children:ReactNode;onClose:()=>void;dirty?:boolean}) {
 const {t}=useI18n(); const router=useRouter(); const [discard,setDiscard]=useState(false); const destination=useRef<string|null>(null);
 useEffect(()=>{
  if(!dirty)return;
  const unload=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
  const navigate=(e:MouseEvent)=>{if(e.defaultPrevented)return;const link=(e.target as Element)?.closest?.("a[href]");const href=link?.getAttribute("href");if(link?.getAttribute("target") === "_blank" || link?.hasAttribute("download") || !href || !/^\/(admin|account)(\/|\?|$)/.test(href) || e.ctrlKey || e.metaKey || e.shiftKey)return;e.preventDefault();e.stopPropagation();destination.current=href;setDiscard(true);};
  window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);
  return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true);};
 },[dirty]);
 const close=()=>{if(dirty){destination.current=null;setDiscard(true);}else onClose();};
 return <Modal title={title} className="admin-panel" onClose={close}><div hidden={discard}>{children}</div>{discard&&<section className="stack" role="alert"><h3>{t("Bỏ thay đổi chưa lưu?")}</h3><p>{t("Các thay đổi trong biểu mẫu này chưa được lưu.")}</p><div className="row wrap"><button className="btn ghost" type="button" onClick={()=>setDiscard(false)}>{t("Tiếp tục chỉnh sửa")}</button><button className="btn danger" type="button" onClick={()=>{const href=destination.current;onClose();if(href)router.push(href);}}>{t("Bỏ thay đổi")}</button></div></section>}</Modal>;
}
export function AdminFeedback({error,message}: {error?:string;message?:string}) {
 return <>{error && <p className="admin-feedback err" role="alert">{error}</p>}{message && <p className="admin-feedback" role="status">{message}</p>}</>;
}
export function AdminEmpty({title,children}: {title:string;children?:ReactNode}) {return <div className="admin-empty"><h3>{title}</h3>{children && <p className="mute">{children}</p>}</div>;}
export function AdminLoading() { const {t}=useI18n();return <div className="admin-skeleton" role="status" aria-label={t("Đang tải dữ liệu quản trị…")}><span/><span/><span/></div>; }
export function useAdminFormId() { return useId().replace(/:/g,""); }

// Inline settings keep their drafts when changing tabs. Leaving the page requires
// an explicit discard; reloads use the browser's native unsaved-changes warning.
export function AdminUnsavedChanges({dirty}: {dirty:boolean}) {
 const {t}=useI18n();const router=useRouter();const [destination,setDestination]=useState("");
 const bypass=useRef(false);
 useEffect(()=>{
  if(!dirty)return;
  const unload=(e:BeforeUnloadEvent)=>{if(bypass.current)return;e.preventDefault();e.returnValue="";};
  const navigate=(e:MouseEvent)=>{
   if(e.defaultPrevented)return;
   const anchor=(e.target as Element)?.closest?.("a[href]");
   const href=anchor?.getAttribute("href");
   if(!href||!/^\/(admin|account)(\/|\?|$)/.test(href)||anchor?.getAttribute("target")==="_blank"||anchor?.hasAttribute("download")||e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0||bypass.current||href===window.location.pathname+window.location.search)return;
   e.preventDefault();e.stopPropagation();setDestination(href);
  };
  window.addEventListener("beforeunload",unload);document.addEventListener("click",navigate,true);
  return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigate,true);};
 },[dirty]);
 return destination?<Modal title={t("Bỏ thay đổi chưa lưu?")} onClose={()=>setDestination("")}><p>{t("Các thay đổi trong biểu mẫu này chưa được lưu.")}</p><div className="admin-form-actions"><button className="btn ghost" onClick={()=>setDestination("")}>{t("Tiếp tục chỉnh sửa")}</button><button className="btn danger" onClick={()=>{bypass.current=true;router.push(destination);setDestination("");}}>{t("Bỏ thay đổi")}</button></div></Modal>:null;
}
