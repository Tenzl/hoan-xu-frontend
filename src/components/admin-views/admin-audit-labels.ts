export const auditActions: Record<string,string> = {
 internal_account_created:"Tạo tài khoản", internal_account_reset:"Đặt lại tài khoản",
 internal_permissions_updated:"Chỉnh quyền", internal_password_reset:"Đặt lại mật khẩu",
 internal_status_updated:"Khóa / mở khóa tài khoản",customer_blocked:"Khóa / mở khóa khách",
 legacy_customer_renamed:"Sửa tên khách",legacy_manual_order:"Thêm đơn lịch sử",
 notification_created:"Gửi thông báo",notification_deleted:"Xóa thông báo",
 order_approved:"Duyệt đơn",order_rejected:"Từ chối đơn",order_reopened:"Mở lại đơn",
 order_adjustment:"Điều chỉnh đơn",manual_order:"Thêm đơn từ báo cáo sàn",
 withdraw_processing:"Nhận xử lý rút tiền",withdraw_paid:"Xác nhận đã chuyển khoản",
 withdraw_rejected:"Từ chối rút tiền",settings_updated:"Cập nhật cài đặt",
 cashback_policy_created:"Cập nhật chính sách hoàn Xu",xu_exchange_policy_created:"Cập nhật tỷ lệ đổi Xu",
 gift_created:"Thêm quà",gift_updated:"Cập nhật quà",gift_completed:"Cấp voucher",
 gift_rejected:"Từ chối đổi quà",gift_out_of_stock:"Đánh dấu hết hàng",
 gift_refund_out_of_stock:"Hoàn Xu vì hết hàng",weekly_prize_configured:"Cấu hình thưởng tuần",
 weekly_prize_settled:"Chốt thưởng tuần",weekly_prize_delivered:"Trao quà tuần",
 shopee_settings_updated:"Cập nhật kết nối Shopee",shopee_publisher_updated:"Cập nhật mã tiếp thị Shopee",
 shopee_verification_started:"Bắt đầu kiểm tra Shopee",shopee_verification_finished:"Hoàn tất kiểm tra Shopee",
 browser_opened:"Mở phiên Shopee",browser_closed:"Đóng phiên Shopee",browser_reset:"Đặt lại phiên Shopee",
 import_preview:"Xem trước báo cáo",import_row_resolved:"Khớp dòng báo cáo",
 deal_hide:"Ẩn bài đăng",deal_show:"Hiện bài đăng",deal_delete:"Xóa bài đăng",
 legacy_import_completed:"Nhập dữ liệu hệ thống cũ",bank_profile_updated:"Cập nhật tài khoản ngân hàng",
};
export function auditResource(action:string) {
 if(action.startsWith("internal_"))return "Tài khoản nội bộ";
 if(action.startsWith("withdraw_"))return "Yêu cầu rút tiền";
 if(action.startsWith("gift_"))return "Quà tặng";
 if(action.startsWith("weekly_"))return "Thưởng xếp hạng tuần";
 if(action.startsWith("notification_"))return "Thông báo";
 if(action.startsWith("deal_"))return "Bài đăng cộng đồng";
 if(action.includes("order"))return "Đơn hàng";
 if(action.startsWith("customer_")||action.startsWith("legacy_customer"))return "Khách hàng";
 if(action.startsWith("import_")||action==="legacy_import_completed")return "Nhập báo cáo đơn hàng";
 if(action.startsWith("shopee_")||action.startsWith("browser_"))return "Kết nối Shopee";
 return "Hệ thống";
}
export const ledgerKinds:Record<string,string>={available:"Xu vàng khả dụng",held:"Xu vàng tạm giữ",gift_held:"Xu vàng giữ đổi quà",debt:"Xu cần bù",system:"Xu vàng hệ thống",green_available:"Xu xanh khả dụng",green_gift_held:"Xu xanh giữ đổi quà",green_system:"Xu xanh hệ thống"};
