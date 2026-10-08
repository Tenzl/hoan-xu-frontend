/** Only wrap canonical short links: never discard affiliate query parameters. */
export function shopeeShareURL(affiliateURL: string, origin: string) {
  const match = /^https:\/\/s\.shopee\.vn\/([A-Za-z0-9]+)$/.exec(affiliateURL);
  return match && origin ? new URL(`/shopee/${match[1]}`, origin).href : affiliateURL;
}

/** No lookup is needed; the destination host is always fixed. */
export function shopeeRedirectURL(pathname: string) {
  const match = /^\/shopee\/([A-Za-z0-9]+)$/.exec(pathname);
  return match ? `https://s.shopee.vn/${match[1]}` : null;
}
