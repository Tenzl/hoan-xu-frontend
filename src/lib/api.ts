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
export function setCSRF(token: string) {
  csrf = token;
}
export type PageMeta = { hasNext?: boolean; nextCursor?: string | null; requestId?: string };
export type ApiPage<T> = { data: T; meta: PageMeta };
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
  key?: string,
  signal?: AbortSignal,
): Promise<T> {
  return (await request<T>(path,method,body,key,signal)).data;
}
export async function apiPage<T>(path:string,signal?:AbortSignal):Promise<ApiPage<T>> {
  return request<T>(path,"GET",undefined,undefined,signal);
}
async function request<T>(path:string,method:string,body?:unknown,key?:string,signal?:AbortSignal):Promise<ApiPage<T>> {
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
    r = await fetch("/api/v1" + path, {
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
      t("Kết nối đang gián đoạn. Vui lòng thử lại sau."),
    );
  }
	if (r.status === 204 && r.ok) return {data:undefined as T,meta:{}};
  let v;
  try {
    v = await r.json();
  } catch {
    throw new ApiError(
      r.status,
      "API_UNAVAILABLE",
      t("Chưa tải được dữ liệu. Vui lòng thử lại."),
    );
  }
  if (!r.ok)
    throw new ApiError(
      r.status,
      v.error?.code || "REQUEST_FAILED",
      t(v.error?.message || "Không xử lý được yêu cầu."),
    );
  return {data:v.data as T,meta:v.meta || {}};
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
