# Luồng lấy link và ví Xu

Người mua nhập link Shopee ở Tổng quan để xem nhanh tiền hoàn dự kiến, tạo link và chuyển sang màn Lấy link hoàn tiền với kết quả đầy đủ.

- Tổng quan và màn Lấy link dùng chung link nhập, kết quả kiểm tra và kết quả tạo link trong phiên điều hướng. Đổi tài khoản hoặc tải lại trang sẽ xóa trạng thái này.
- Tổng quan chỉ hiện câu tiền hoàn bên phải ô nhập; mobile cho phép xuống dòng. Ví Xu có trên mọi màn khách hàng, gồm Hỗ trợ, và nằm dưới nội dung trên mobile. Quản trị không hiện ví khách hàng.
- Link nhập ở cả hai màn cập nhật vòng tiến độ, chi tiết dự kiến và quyền lợi theo hạng trong ví. Tiền dự kiến không làm tăng số dư có thể rút. Bỏ khối tiền hoàn riêng trong ví.
- Chờ cả tạo link và kiểm tra sản phẩm hoàn tất trước khi chuyển từ Tổng quan sang màn kết quả. Lỗi hoặc đổi link giữa lúc xử lý không được tự chuyển màn với kết quả cũ.
- Tạo link thành công hiển thị xác nhận đã cập nhật trong Đơn hàng và đường dẫn mở mục đó. Sử dụng API hiện có, không đổi database.

Đây là yêu cầu của chủ sản phẩm, không phải kết luận từ dữ liệu sử dụng thực tế. Chưa có nguồn analytics được kết nối cho thay đổi này. Tiêu chí kiểm chứng là các kiểm tra Playwright về đồng bộ ví, mạng chậm, lỗi, yêu cầu trùng, chuyển màn, đổi tài khoản và bố cục trên desktop/mobile.

Theo dõi bước tiếp theo trong [ROADMAP.md](ROADMAP.md).
