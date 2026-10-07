"use client";
import { useEffect, useState } from "react";
export function linkExpired(expiresAt: string | null | undefined, now = Date.now()) {
    const expiry = Date.parse(expiresAt || "");
    return !Number.isFinite(expiry) || now >= expiry;
}
export function useLinkExpiry(expiresAt: string | undefined) {
    return linkExpired(expiresAt, useLinkClock(expiresAt));
}
const listeners = new Map<(now: number) => void, number>();
let timer: ReturnType<typeof setTimeout> | undefined;
function schedule() {
    if (timer !== undefined)
        clearTimeout(timer);
    if (!listeners.size)
        return;
    const now = Date.now();
    let delay = 60000 - (now % 60000);
    for (const expiry of listeners.values())
        if (expiry > now)
            delay = Math.min(delay, expiry - now);
    timer = setTimeout(tick, Math.max(1, delay));
}
function tick() {
    const now = Date.now();
    for (const listener of listeners.keys())
        listener(now);
    schedule();
}
function subscribe(listener: (now: number) => void, expiresAt: string) {
    if (!listeners.size) {
        document.addEventListener("visibilitychange", tick);
        window.addEventListener("focus", tick);
    }
    listeners.set(listener, Date.parse(expiresAt));
    listener(Date.now());
    schedule();
    return () => {
        listeners.delete(listener);
        schedule();
        if (!listeners.size) {
            if (timer !== undefined)
                clearTimeout(timer);
            timer = undefined;
            document.removeEventListener("visibilitychange", tick);
            window.removeEventListener("focus", tick);
        }
    };
}
// One scheduler serves all links, ticking at minute boundaries and exact expirations.
export function useLinkClock(expiresAt: string | undefined) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => expiresAt ? subscribe(setNow, expiresAt) : undefined, [expiresAt]);
    return now;
}
