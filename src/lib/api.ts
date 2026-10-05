import type { components } from "./api-schema";
import { getLanguage, translate as t } from "./i18n";
export type User = components["schemas"]["User"];
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
let csrf = "";
const cursors = new Map<string, Map<number, string>>();
export function setCSRF(token: string) {
  if (csrf !== token) cursors.clear();
  csrf = token;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(path, "http://localhost");
  const page = Number(url.searchParams.get("page") || 1);
  const scope = new URL(url);
  scope.searchParams.delete("page");
  scope.searchParams.delete("cursor");
  const scopeKey = scope.pathname + scope.search;
  const cursor = cursors.get(scopeKey)?.get(page);
  if (method === "GET" && cursor) url.searchParams.set("cursor", cursor);
  const requestPath = url.pathname + url.search;
  const headers: Record<string, string> = { "Accept-Language": getLanguage() };
  if (method !== "GET") {
    headers["X-CSRF-Token"] = csrf;
    if (key) headers["Idempotency-Key"] = key;
  }
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm)
    headers["Content-Type"] = "application/json";
  let r: Response;
  try {
    r = await fetch("/api/v1" + requestPath, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal,
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      503,
      "API_UNAVAILABLE",
      t("Backend chưa sẵn sàng. Kiểm tra PostgreSQL và Go API."),
    );
  }
  let v;
  try {
    v = await r.json();
  } catch {
    throw new ApiError(
      r.status,
      "API_UNAVAILABLE",
      t("Không kết nối được Go API."),
    );
  }
  if (!r.ok)
    throw new ApiError(
      r.status,
      v.error?.code || "REQUEST_FAILED",
      t(v.error?.message || "Không xử lý được yêu cầu."),
    );
  if (method === "GET" && v.meta?.nextCursor) {
    let pages = cursors.get(scopeKey);
    if (!pages) {
      pages = new Map();
      cursors.set(scopeKey, pages);
    }
    pages.set(page + 1, v.meta.nextCursor);
  }
  return v.data as T;
}
export function idempotencyKey() {
  return crypto.randomUUID();
}
export function money(n: unknown) {
  return (
    Number(n || 0).toLocaleString(getLanguage() === "en" ? "en-US" : "vi-VN") +
    (getLanguage() === "en" ? "₫" : "đ")
  );
}
export function date(v: unknown) {
  if (!v) return "—";
  return new Date(String(v)).toLocaleDateString(
    getLanguage() === "en" ? "en-GB" : "vi-VN",
    {
      timeZone: "Asia/Ho_Chi_Minh",
    },
  );
}
