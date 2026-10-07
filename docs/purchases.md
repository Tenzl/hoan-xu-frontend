# Link hoàn tiền và Đơn hàng

Trang lấy link giữ phần tạo link và kết quả ngắn gọn. Mọi thao tác quản lý chuyển sang Đơn hàng, mặc định mở Đang lựa. Link hết hạn chưa có đơn xuất hiện ở Từ chối; đơn mua đúng hạn báo cáo muộn vẫn theo trạng thái đối soát hiện có.

| Trước | Sau | Lý do |
| --- | --- | --- |
| URL và thao tác tách dòng | Một hàng, URL có ellipsis và vẫn sao chép đầy đủ | Giữ thao tác gần URL, vừa màn hình nhỏ |
| Thông tin thời hạn lẫn trong nội dung | Khung nền nhẹ, viền rõ; nhãn trái, countdown phải | Dễ nhận ra hạn hoàn Xu |
| Hạng/hệ số cạnh kết quả | Bỏ dòng này khỏi kết quả | Tập trung vào link và thời hạn; dữ liệu tính vẫn ở backend |
| Quản lý link và lịch sử trên trang tạo | Đang lựa, Đang xử lý, Hoàn thành, Từ chối, Tất cả ở Đơn hàng | Tách thao tác tạo khỏi theo dõi mua hàng |

Khung thời hạn dùng chữ số tabular để tránh thay đổi bố cục, lịch theo GMT+7 và giờ/phút khi còn dưới một ngày. Các thao tác có tên accessible; chế độ giảm chuyển động tắt hiệu ứng nhấn. Kiểm thử desktop/mobile gồm 320px, VI/EN, sáng/tối, bàn phím, hết hạn và không có thao tác xóa, kể cả khi API cũ trả `canDelete: true`.

Người dùng không thể xóa link: giao diện không có nút xóa và API từ chối yêu cầu xóa. Link bị cancel vẫn hiển thị thông báo và thời hạn; không thể sao chép hoặc mở mua, kể cả khi bị hủy trước thời hạn. Danh sách đơn dùng một nền chung với đường phân cách nhẹ, giữ tên sản phẩm, trạng thái, mã đơn, ngày đặt, giá trị đơn, Xu hoàn, URL và thời hạn. URL dùng cùng font chữ của giao diện.

`GET /me/purchases` phân trang ở backend. Đơn có link hiển thị cùng link; link đã xóa không được tạo lại khi báo cáo được nhập. Link lịch sử thiếu tên dùng “Tên sản phẩm chưa có”; dữ liệu mới lấy `productName` từ backend.
