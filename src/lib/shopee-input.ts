const hosts = new Set(["shopee.vn", "www.shopee.vn", "s.shopee.vn", "affiliate.shopee.vn", "vn.shp.ee"]);

export function isShopeeURL(value: string) {
  if (value.length > 2048) return false;
  try {
    const url = new URL(value);
    const authority = value.match(/^https:\/\/([^/?#]+)/iu)?.[1];
    return url.protocol === "https:" && !url.username && !url.password && !url.port
      && authority?.toLowerCase() === url.hostname && hosts.has(url.hostname) && url.pathname !== "/";
  } catch { return false; }
}

export function normalizeShopeeInput(value: string): { url: string; error?: string } {
  const raw = value.trim();
  if (!raw) return { url: "" };
  if (raw.length > 2048) return { url: raw, error: "Link quá dài. Hãy dán link sản phẩm trực tiếp." };
  const urls = raw.match(/https?:\/\/[^\s<>"“”]+/giu) || [];
  if (urls.length > 1) return { url: raw, error: "Đoạn bạn dán có nhiều link. Chỉ giữ một link sản phẩm." };
  const url = (urls[0] || raw).replace(/[),.;!\]}>]+$/u, "");
  if (!isShopeeURL(url)) return { url: raw, error: "Dán link sản phẩm Shopee hợp lệ để tiếp tục." };
  return { url };
}
