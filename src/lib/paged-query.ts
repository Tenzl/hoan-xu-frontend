"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiPage, type ApiPage } from "./api";
// Pagination metadata belongs to the query result, never to a process-wide cursor cache.
export function usePagedQuery<T>(path: string, enabled = true, refetchInterval: number | false = false, scope?: string) {
    const cache = useQueryClient();
    const query = useQuery({ queryKey: ["page", path, scope], queryFn: ({ signal }) => {
            const url = new URL(path, "http://localhost");
            const page = Number(url.searchParams.get("page") || 1);
            if (page > 1) {
                const previous = new URL(url);
                previous.searchParams.set("page", String(page - 1));
                const cursor = cache.getQueryData<ApiPage<T>>(["page", previous.pathname + previous.search, scope])?.meta.nextCursor;
                if (cursor)
                    url.searchParams.set("cursor", cursor);
            }
            return apiPage<T>(url.pathname + url.search, signal);
        }, enabled, refetchInterval });
    return { ...query, data: query.data?.data, meta: query.data?.meta };
}
