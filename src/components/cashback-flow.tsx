"use client";
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type User } from "@/lib/api";
import { checkerErrorMessage } from "@/lib/checker-errors";
import { useI18n } from "@/lib/i18n";
import { isShopeeURL, productCheckOptions, useProductCheck } from "@/lib/product-check";
import type { CreatedAffiliateLink } from "@/lib/domain";
import type { AppContext } from "./app-context";
import { normalizeShopeeInput } from "@/lib/shopee-input";

const draftKey = "hoanxu.login-product-draft";
export function clearLoginDraft() { try { sessionStorage.removeItem(draftKey); } catch {} }

function useFlow(owner: string, customer: boolean) {
  const { t } = useI18n();
  const client = useQueryClient();
  const [url, setURL] = useState("");
  const [result, setResult] = useState<CreatedAffiliateLink | null>(null);
  const path = usePathname();
  const previousPath = useRef(path);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [inputError, setInputError] = useState("");
  const [rejectedURL, setRejectedURL] = useState("");
  const version = useRef(0);
  const inFlight = useRef(false);
  const pendingLink = useRef<{ version: number; link: CreatedAffiliateLink } | null>(null);
  const product = useProductCheck(url, owner);
  const shopBlocked = product.state.errorCode === "NOT_PRODUCT_LINK" || (Boolean(rejectedURL) && rejectedURL === url.trim());

  useEffect(() => () => { version.current++; }, []);

  useEffect(() => {
    if (owner === "guest") return;
    try {
      const draft = sessionStorage.getItem(draftKey);
      sessionStorage.removeItem(draftKey);
      if (customer && draft && isShopeeURL(draft)) setURL(draft);
    } catch {}
  }, [owner, customer]);

  function changeURL(value: string) {
    version.current++;
    const normalized = normalizeShopeeInput(value);
    setURL(normalized.url);
    setInputError(normalized.error || "");
    setResult(null);
    setError("");
    setRejectedURL("");
    pendingLink.current = null;
  }
  useLayoutEffect(() => {
    const previous = previousPath.current;
    if (previous === path) return;
    previousPath.current = path;
    // Keep only the successful overview-to-link handoff across navigation.
    if (previous === "/" && path === "/link" && result) return;
    changeURL("");
    if (owner === "guest" && path !== "/login") clearLoginDraft();
  }, [path, result, owner]);
  async function create(ctx: AppContext) {
    if (inFlight.current || shopBlocked || inputError || !url.trim()) return false;
    if (ctx.me?.role !== "customer") {
      ctx.notify(t("Đăng nhập Google để tạo link."));
      return false;
    }
    const current = version.current;
    const source = url.trim();
    inFlight.current = true;
    setCreating(true);
    setError("");
    try {
      // A failed preview can be retried without creating a second successful link.
      const [creation, preview] = await Promise.allSettled([
        pendingLink.current?.version === current ? Promise.resolve(pendingLink.current.link) : ctx.act("/affiliate-links", "POST", { url: source }),
        isShopeeURL(source) ? client.fetchQuery(productCheckOptions(source, owner)) : Promise.resolve(),
      ]);
      if (current !== version.current) return false;
      if (creation.status === "rejected") throw creation.reason;
      pendingLink.current = { version: current, link: creation.value };
      if (preview.status === "rejected" && !creation.value.reused) throw preview.reason;
      setResult(creation.value);
      pendingLink.current = null;
      return true;
    } catch (e) {
      if (current === version.current) {
        const code = e instanceof ApiError ? e.code : undefined;
        setError(checkerErrorMessage(code, (e as Error).message));
        if (code === "NOT_PRODUCT_LINK") setRejectedURL(source);
      }
      return false;
    } finally {
      inFlight.current = false;
      setCreating(false);
    }
  }
  function prepareLogin() {
    try {
      if (owner === "guest" && isShopeeURL(url)) sessionStorage.setItem(draftKey, url);
      // Navigation clears the form, but the login page still needs its saved URL.
      else if (owner !== "guest" || path !== "/login") sessionStorage.removeItem(draftKey);
    } catch {}
  }
  return { url, changeURL, result, inputError, prepareLogin, clearResult: () => { version.current++; pendingLink.current = null; setResult(null); }, check: product.state, retryCheck: product.retry, creating, error, shopBlocked, create };
}

const FlowContext = createContext<ReturnType<typeof useFlow> | null>(null);
function SessionFlow({ owner, customer, children }: { owner: string; customer: boolean; children: ReactNode }) {
  const flow = useFlow(owner, customer);
  return <FlowContext.Provider value={flow}>{children}</FlowContext.Provider>;
}
export function CashbackFlowProvider({ children }: { children: ReactNode }) {
  const session = useQuery({ queryKey: ["/me"], queryFn: () => api<User>("/me") });
  const owner = session.data?.id || "guest";
  return <SessionFlow key={owner} owner={owner} customer={session.data?.role === "customer"}>{children}</SessionFlow>;
}
export function useCashbackFlow() {
  const flow = useContext(FlowContext);
  if (!flow) throw new Error("CashbackFlowProvider is required");
  return flow;
}
