"use client";
import { useEffect, useState } from "react";

export function linkExpired(expiresAt: string | undefined, now = Date.now()) {
  const expiry = Date.parse(expiresAt || "");
  return !Number.isFinite(expiry) || now >= expiry;
}
export function useLinkExpiry(expiresAt: string | undefined) {
	return linkExpired(expiresAt,useLinkClock(expiresAt));
}
export function useLinkClock(expiresAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    if (!expiresAt) return;
    const timer = window.setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", update); window.removeEventListener("focus", update); };
  }, [expiresAt]);
  return now;
}
