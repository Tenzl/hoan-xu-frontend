import { Bell, ClipboardList, Flame, Gift, History, Home, Package, Settings, Shield, Trophy, Users, Wallet } from "lucide-react";
import type { User } from "@/lib/api";

export const adminNav = [
 ["/admin", "Tổng quan quản trị", Home, "overview", ""],
 ["/admin/orders", "Đơn hàng & đối soát", Package, "orders", "Vận hành"],
 ["/admin/imports", "Nhập báo cáo đơn hàng", ClipboardList, "orders", "Vận hành"],
 ["/admin/withdrawals", "Yêu cầu rút tiền", Wallet, "withdrawals", "Vận hành"],
 ["/admin/users", "Khách hàng", Users, "users", "Khách hàng"],
 ["/admin/gifts", "Quà tặng", Gift, "gifts", "Quà & cộng đồng"],
 ["/admin/leaderboard-prizes", "Thưởng xếp hạng tuần", Trophy, "gifts", "Quà & cộng đồng"],
 ["/admin/deals", "Bài đăng cộng đồng", Flame, "community", "Quà & cộng đồng"],
 ["/admin/notifications", "Thông báo", Bell, "notifications", "Quà & cộng đồng"],
 ["/admin/settings", "Chính sách & cài đặt", Settings, "settings", "Hệ thống"],
 ["/admin/cookies", "Kết nối Shopee", Shield, "settings", "Hệ thống"],
 ["/admin/accounts", "Tài khoản & phân quyền", Shield, "internal", "Hệ thống"],
 ["/admin/audit", "Nhật ký quản trị", History, "audit", "Hệ thống"],
] as const;
export function canAdmin(me: User | undefined, permission: string) {
 return !!me && (me.role === "admin" || (me.role === "staff" && (permission === "overview" || me.permissions?.includes(permission))));
}
export function adminRoute(path: string) {
 if (/^\/admin\/(legacy-users|users)(?:\/[^/]+\/orders)?$/.test(path)) return adminNav.find(n=>n[0]==="/admin/users")!;
 return adminNav.find(n=>n[0]===path);
}
export const adminDescriptions: Record<string,string> = {
 "/admin":"Theo dõi công việc cần xử lý và kết quả vận hành.",
 "/admin/orders":"Tìm đơn, kiểm tra trạng thái sàn và đối soát Xu hoàn cho khách.",
 "/admin/imports":"Tải báo cáo sàn, kiểm tra dữ liệu rồi xác nhận nhập đơn.",
 "/admin/withdrawals":"Tiếp nhận yêu cầu và ghi nhận bằng chứng chuyển khoản.",
 "/admin/users":"Tra cứu khách hàng, số dư Xu và lịch sử đơn hàng.",
 "/admin/gifts":"Theo dõi yêu cầu đổi quà, danh mục và tồn kho.",
 "/admin/leaderboard-prizes":"Cấu hình quà tuần, chốt người thắng và theo dõi trao quà.",
 "/admin/deals":"Xem và kiểm duyệt các bài chia sẻ của cộng đồng.",
 "/admin/notifications":"Soạn thông báo và kiểm tra lịch sử đã gửi.",
 "/admin/settings":"Quản lý thông tin, chính sách Xu và nội dung hỗ trợ.",
 "/admin/cookies":"Theo dõi phiên Shopee, cấu hình kết nối và kiểm tra hoạt động.",
 "/admin/accounts":"Cấp tài khoản, chọn quyền và quản lý truy cập của nhân viên.",
 "/admin/audit":"Tra cứu thao tác quản trị và kiểm tra số dư với sổ giao dịch.",
};
