"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import type { components } from "./api-schema";
import { isShopeeURL } from "./shopee-input";
export { isShopeeURL } from "./shopee-input";

export type ProductCheck = components["schemas"]["ProductCheck"];
export type ProductCheckState = { url: string; loading: boolean; product?: ProductCheck; error?: string; errorCode?: string };

export function productCheckOptions(url: string, owner = "guest") {
  return {
    queryKey: ["/product-checks", owner, url],
    queryFn: ({ signal }: { signal: AbortSignal }) => api<ProductCheck>("/product-checks", "POST", { url }, undefined, signal),
    staleTime: 60000,
    retry: false,
  };
}

export function useProductCheck(url: string, owner = "guest") {
  const currentURL = url.trim();
  const [settledURL, setSettledURL] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setSettledURL(currentURL), 500);
    return () => clearTimeout(timer);
  }, [currentURL]);
  const valid = isShopeeURL(currentURL);
  const query = useQuery({ ...productCheckOptions(currentURL, owner), enabled: valid && settledURL === currentURL });
  const state: ProductCheckState = {
    url: currentURL,
    loading: valid && (query.isPending || query.isFetching),
    product: query.data,
    error: query.error?.message,
    errorCode: query.error instanceof ApiError ? query.error.code : undefined,
  };
  return { state, retry: () => { void query.refetch(); } };
}
