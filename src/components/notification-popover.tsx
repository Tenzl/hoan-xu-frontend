"use client";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bell, Check, X } from "lucide-react";
import Link from "next/link";
import { apiPage, date, type User } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

type Notice = { id: string; title: string; body: string; createdAt: string; read: boolean };
export function NotificationPopover({ user, act }: {
  user?: User;
  act: (path: string, method?: string) => Promise<unknown>;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["notification-popover", user?.id],
    initialPageParam: "",
    queryFn: ({ pageParam,signal }) => apiPage<Notice[]>(`/notifications?perPage=20${pageParam ? "&cursor="+encodeURIComponent(pageParam):""}`,signal),
    getNextPageParam: (last) => last.meta.hasNext && last.meta.nextCursor ? last.meta.nextCursor : undefined,
    enabled: !!user,
    refetchInterval: 60000,
  });
  const notices = Array.from(new Map((query.data?.pages.flatMap(page=>page.data) || []).map(n => [n.id, n])).values());
  const unread = notices.some(n => !n.read);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    const focus = (event: FocusEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("focusin", focus);
    };
  }, [open]);
  async function mark(path: string, method = "POST") {
    setPending(true); setError("");
    try { await act(path, method); }
    catch (e) { setError((e as Error).message); }
    finally { setPending(false); }
  }
  return <div className="notification-anchor" ref={root}>
    <button ref={trigger} className="btn sm ghost notification-trigger" aria-label={t("Thông báo")} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? "notification-popup" : undefined} onClick={() => { setOpen(!open); setError(""); }}>
      <span className="notification-bell"><Bell size={18} />{unread && <span className="notification-dot" aria-label={t("Có thông báo chưa đọc")} />}</span>
    </button>
    {open && <section id="notification-popup" className="notification-popup" role="dialog" aria-labelledby="notification-title">
      <header className="notification-header">
        <div><h2 id="notification-title">{t("Thông báo")}</h2>{user && query.data && !query.isError && <p className="small mute">{t(unread ? "Có thông báo chưa đọc" : "Bạn đã đọc hết thông báo")}</p>}</div>
        <button ref={close} className="btn sm ghost icon-button" aria-label={t("Đóng thông báo")} onClick={() => { setOpen(false); trigger.current?.focus(); }}><X size={18} /></button>
      </header>
      {user && notices.length > 0 && <div className="notification-actions"><button className="btn sm ghost" disabled={pending || !unread} onClick={() => mark("/notification-read-batches")}><Check size={15} />{t("Đánh dấu tất cả đã đọc")}</button></div>}
      {error && <p className="notification-message err" role="alert">{t(error)}</p>}
      <div className="notification-scroll" tabIndex={0} aria-label={t("Danh sách thông báo")} onScroll={event => {
        const el = event.currentTarget;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && query.hasNextPage && !query.isFetching && !query.isFetchNextPageError) void query.fetchNextPage();
      }}>
        {!user ? <div className="notification-message"><p>{t("Đăng nhập để xem thông báo.")}</p><Link className="btn sm" href="/login">{t("Đăng nhập")}</Link></div>
          : query.isPending ? <p className="notification-message mute" role="status">{t("Đang tải thông báo…")}</p>
          : query.isError && !query.data ? <div className="notification-message" role="alert"><p>{t(query.error.message)}</p><button className="btn sm ghost" onClick={() => query.refetch()}>{t("Thử lại")}</button></div>
          : notices.length === 0 ? <div className="notification-message"><Bell size={28} /><p>{t("Chưa có thông báo.")}</p></div>
          : <ul className="notification-list">{notices.map(n => <li key={n.id} className={n.read ? "notification-item" : "notification-item unread"}>
            <span className="notification-state-dot" aria-hidden="true" />
            <div className="notification-copy"><div className="notification-item-title"><h3>{n.title}</h3><span className="notification-state">{t(n.read ? "Đã đọc" : "Chưa đọc")}</span></div><p>{n.body}</p><div className="notification-item-footer"><time dateTime={n.createdAt}>{date(n.createdAt)}</time>{!n.read && <button className="notification-read" disabled={pending} onClick={() => mark(`/notifications/${n.id}/read-receipt`, "PUT")}>{t("Đánh dấu đã đọc")}</button>}</div></div>
          </li>)}</ul>}
        {query.isFetchingNextPage && <p className="notification-message mute" role="status">{t("Đang tải thông báo…")}</p>}
        {query.hasNextPage && <button className="btn sm ghost notification-load" disabled={query.isFetching} onClick={() => query.fetchNextPage()}>{t(query.isFetchNextPageError ? "Thử lại" : "Xem thêm")}</button>}
      </div>
    </section>}
  </div>;
}
