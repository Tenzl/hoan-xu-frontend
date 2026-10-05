# Đối chiếu HTML mẫu và ứng dụng

Tài liệu lịch sử của workspace gốc. HTML mẫu hiện nằm cùng thư mục `docs/reference/`; đường dẫn `/demo` không được phục vụ trong ứng dụng thật. Hướng dẫn hiện tại ở README của repo frontend.

Hai nguồn ở root được giữ nguyên. `/demo` tải bản HTML gốc độc lập, giữ chuyển chế độ khách/admin, khôi phục và xóa dữ liệu mẫu. Các thao tác trong demo không gọi API nghiệp vụ.

| Màn hình mẫu | Đường dẫn ứng dụng | Xử lý dữ liệu thật |
|---|---|---|
| Tổng quan khách | `/` | Ví, xu, đơn duyệt, hạng và leaderboard tháng |
| Lấy link | `/link` | Checker/tracking có cờ kiểm chứng; chưa cấu hình thì báo lỗi rõ ràng |
| Link đã lưu | `/save` | Link riêng từng khách, đánh dấu lưu |
| Deal cộng đồng | `/deal` | Bài PostgreSQL, lượt hữu ích duy nhất, kiểm duyệt |
| Điểm danh | `/checkin` | Ngày Việt Nam, chuỗi và thưởng mốc |
| Đổi quà | `/gift` | Giữ xu/tồn, cấp mã thủ công, hoàn xu khi từ chối |
| Đơn hàng | `/orders` | Attribution từ báo cáo, không tạo đơn khi tạo link |
| Ví | `/wallet` | Ledger, khả dụng/tạm giữ/debt, yêu cầu rút |
| Thông báo | `/notif` | Chung/cá nhân, trạng thái đọc riêng |
| Hỗ trợ | `/help` | FAQ và email quản trị cấu hình |
| Tổng quan quản trị | `/admin` | Thống kê PostgreSQL |
| Đối soát | `/admin/orders` | Nhập tay có bằng chứng; duyệt/từ chối/điều chỉnh |
| Rút tiền | `/admin/withdrawals` | Nhận xử lý, bằng chứng private, chi/từ chối |
| Người dùng | `/admin/users` | Khóa/mở có lý do, thu hồi session |
| Đổi quà | `/admin/gifts` | Tồn kho và yêu cầu cấp mã |
| Cộng đồng | `/admin/deals` | Ẩn/hiện/xóa mềm có audit |
| Thông báo | `/admin/notifications` | Thông báo chung/cá nhân, xóa mềm |
| Cài đặt affiliate | `/admin/settings` | Chính sách, kênh, ngân sách, FAQ/email |

Màn hình bổ sung: `/login` (Google), `/internal/login`, `/internal/password`, `/account` (profile/session), `/admin/imports` (CSV), `/admin/accounts` (tài khoản do admin cấp), `/admin/audit` (audit và ledger).

Shopee thật chưa được xác minh bằng tài khoản và báo cáo thực. `SHOPEE_ENABLED`, schema/scale và tracking phải vượt các bước trong README trước khi mở. Lazada/TikTok/Tiki tiếp tục có đầy đủ mô phỏng tại `/demo`. Không tự chuyển API lỗi thành dữ liệu mẫu. “Hoàn lên tới 40%” thuộc demo; dữ liệu thật chỉ hiển thị mức do quản trị cấu hình sau khi có cơ sở.
