import type { ReactNode, SVGProps } from "react";

export const giftIcons = [
  { value: "gift", label: "Quà" }, { value: "ticket", label: "Voucher" },
  { value: "shopping-bag", label: "Túi mua sắm" }, { value: "box", label: "Hộp quà" },
  { value: "coffee", label: "Cà phê" }, { value: "headphones", label: "Tai nghe" },
  { value: "star", label: "Ngôi sao" }, { value: "heart", label: "Trái tim" },
] as const;
export type GiftIconKey = typeof giftIcons[number]["value"];
const paths: Record<GiftIconKey, ReactNode> = {
  gift: <><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13"/><path d="M12 8C5 8 5 2 8 3c3 0 4 5 4 5s1-5 4-5c3-1 3 5-4 5Z"/></>,
  ticket: <><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z"/><path d="M15 5v2m0 3v1m0 3v1m0 3v1"/></>,
  "shopping-bag": <path d="m4 7-1 14h18L20 7ZM8 9V6a4 4 0 0 1 8 0v3"/>,
  box: <path d="m12 3 9 5v9l-9 5-9-5V8ZM3 8l9 5 9-5M12 13v9M7 5.8l9 5"/>,
  coffee: <path d="M3 8h13v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5ZM16 9h2a3 3 0 0 1 0 6h-2M6 3v2m4-2v2m4-2v2M2 22h17"/>,
  headphones: <path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13h3v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2ZM20 13h-3v8h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z"/>,
  star: <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>,
  heart: <path d="M12 21 3.5 12.5a5.5 5.5 0 0 1 8.5-7 5.5 5.5 0 0 1 8.5 7Z"/>,
};
export function GiftIcon({ icon = "gift", ...props }: SVGProps<SVGSVGElement> & { icon?: string }) {
  const key = Object.hasOwn(paths, icon) ? icon as GiftIconKey : "gift";
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[key]}</svg>;
}
