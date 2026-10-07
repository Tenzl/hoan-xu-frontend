import type { QueryKey } from "@tanstack/react-query";
export function affectedQuery(path: string, key: QueryKey): boolean {
    const endpoint = path.split("?")[0];
    const query = String(key[0] === "page" ? key[1] : key[0]);
    const starts = (...prefixes: string[]) => prefixes.some(p => query.startsWith(p));
    if (endpoint.startsWith("/auth") || endpoint.startsWith("/me/password"))
        return true;
    if (endpoint === "/me")
        return starts("/me");
    if (endpoint.startsWith("/affiliate-links"))
        return starts("/affiliate-links", "/me/purchases", "/me/dashboard", "/admin/dashboard");
    if (endpoint.startsWith("/notifications") || endpoint === "/notification-read-batches" || endpoint.startsWith("/admin/notifications"))
        return starts("/notifications", "notification-popover", "/admin/notifications");
    if (endpoint.startsWith("/deals") || endpoint.startsWith("/admin/deals"))
        return starts("/deals", "/admin/deals");
    if (endpoint.startsWith("/admin/browser") || endpoint.startsWith("/admin/affiliate-channels"))
        return starts("/admin/browser", "/affiliate-channels", "/admin/affiliate-channels", "/product-checks");
    if (endpoint.startsWith("/admin/settings") || endpoint.startsWith("/admin/cashback-policies"))
        return starts("/config", "/admin/settings", "/admin/cashback-policies", "/me/dashboard", "/affiliate-channels");
    if (endpoint.startsWith("/admin/internal-accounts"))
        return starts("/admin/internal-accounts", "/me");
    if (endpoint.startsWith("/admin/users"))
        return starts("/admin/users", "/me", "/admin/dashboard");
    // Financial actions share wallet, dashboard and leaderboard dependencies.
    if (/orders|imports|withdrawals|gifts|gift-|checkins|exchange/.test(endpoint))
        return starts("/wallet", "/orders", "/affiliate-links", "/withdrawals", "/gift", "/checkins", "/coins", "/me/dashboard", "/me/purchases", "/admin/", "/leaderboards", "leaderboards", "my-leaderboard", "/me/leaderboard");
    return starts(endpoint);
}
