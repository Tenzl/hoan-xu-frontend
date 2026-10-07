# Đổi quà

Trang `/gift` đọc số dư khả dụng và Xu giữ cho quà từ `/wallet`. Danh sách `/gifts` hiển thị quà đang bật, giá Xu, tồn kho và lý do không thể đổi. Hai nguồn tự cập nhật mỗi 15 giây; lỗi tải ví khóa đổi và có nút thử lại. Giao diện có trạng thái tải, rỗng, lỗi, đang gửi và gửi thành công, hoạt động ở 320px và có bản dịch Việt/Anh.

`POST /gift-redemptions` gửi `giftId` và `expectedCostXu` bằng CSRF và Idempotency-Key. Backend kiểm tra giá dưới khóa transaction; giá thay đổi trả 409 `GIFT_PRICE_CHANGED`, không giữ Xu hay quà. Thành công cập nhật ví và danh sách, hiển thị Xu tạm giữ và liên kết `/history?tab=gifts`.

Lỗi mạng hoặc 5xx giữ nguyên yêu cầu, giá và khóa. Khách dùng **Kiểm tra yêu cầu** để thử lại; các nút tạo yêu cầu mới bị khóa trong lúc chưa rõ kết quả. Việc thử lại vẫn hoạt động khi kho/giá đã đổi, vì backend trả lại kết quả cũ theo khóa. Trạng thái này giữ trong phiên thao tác; tải lại toàn bộ trang có thể xem các yêu cầu đã ghi nhận ở lịch sử.

Quà hiện được cấp qua quản trị: hoàn thành cần nhập mã voucher; từ chối trả Xu và tồn kho. Không tự mua voucher Shopee. Câu “Hoàn tiền và Xu điểm danh cùng tích lũy vào ví. 1 Xu = 1đ.” đã bỏ khỏi trang.

Kiểm thử dùng API giả lập và DB riêng, không đổi quà hay chỉnh tồn kho trong DB sử dụng. Backend kiểm tra khóa giá, hoàn tác khi thiếu Xu, thử lại đồng thời, cấp mã mã hóa và quyền xem mã; E2E kiểm tra giao diện, cập nhật số dư, lỗi kho/ví/mạng, tải lại danh sách và chống gửi lại khác giá.
