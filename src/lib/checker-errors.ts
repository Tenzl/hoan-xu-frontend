// Preserve stable checker codes without exposing upstream diagnostics.
const messages: Record<string, string> = {
  BROWSER_UNAVAILABLE: "Chưa xem được sản phẩm lúc này. Bạn thử lại sau nhé.",
  SHOPEE_LOGIN_REQUIRED: "Chưa xem được sản phẩm lúc này. Bạn thử lại sau nhé.",
  SHOPEE_VERIFICATION_REQUIRED: "Chưa xem được sản phẩm lúc này. Bạn thử lại sau nhé.",
  SHOPEE_RESPONSE_NOT_OBSERVED: "Chưa xem được thông tin món này. Bạn thử lại nhé.",
  SHOPEE_UPSTREAM_FAILED: "Chưa xem được thông tin món này. Bạn thử lại nhé.",
  SHOPEE_RATE_LIMITED: "Bạn chờ một chút rồi thử lại nhé.",
  SHOPEE_TIMEOUT: "Tải sản phẩm lâu hơn dự kiến. Bạn thử lại nhé.",
  SHOPEE_RESPONSE_INVALID: "Chưa xem được thông tin món này. Bạn thử lại nhé.",
  QUEUE_FULL: "Sản phẩm đang tải chậm. Bạn thử lại sau một chút nhé.",
  QUEUE_TIMEOUT: "Sản phẩm đang tải chậm. Bạn thử lại sau một chút nhé.",
};
export function checkerErrorMessage(code?: string, fallback = "") {
  return (code && messages[code]) || fallback;
}
