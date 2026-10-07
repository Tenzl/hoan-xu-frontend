# Triển khai giao diện khách hàng

Hướng đã chốt: [PRODUCT.md](PRODUCT.md). Thứ tự triển khai giữ theo kế hoạch của chủ sản phẩm.

## Đã triển khai trong mã nguồn

1. Link rút gọn: chuẩn hóa input chung, vn.shp.ee và đoạn chia sẻ; kiểm thử resolver bằng fixture, giữ bảo vệ URL/chuyển hướng.
2. Đăng nhập và điều hướng: Google cho khách, đăng nhập nội bộ riêng; menu theo luồng mua; Khám phá và Điểm danh riêng.
3. Tổng quan, Lấy link, Đơn hàng, Ví: giữ vé, phân biệt link/đơn, hai loại Xu. Theo điều chỉnh mới nhất của chủ sản phẩm, khôi phục ba cột desktop với ví/quyền lợi bên phải; màn nhỏ xếp xuống dưới. Theo bổ sung mới: bốn số Xu vàng căn phải, đổi Xu đặt trong khu xanh của Ví và xác nhận ngay tại chỗ.
4. Màn bổ trợ: lịch sử, quà, cộng đồng, xếp hạng, hướng dẫn, tài khoản, trang không tồn tại; migration FAQ có điều kiện giữ nội dung đã tùy chỉnh.
5. Kiểm tra và hoàn thiện: typecheck, bản dịch, build, CSP; E2E desktop/mobile và ma trận VI/EN/sáng/tối; backend resolver/integration với database test riêng.

## Kết quả kiểm tra ngày 07/10/2026

- Typecheck, kiểm tra bản dịch và production build: đạt. Bộ kiểm tra script: 12/12 đạt.
- E2E khách, tài khoản, thông báo, đăng nhập/đăng xuất nội bộ và điều hướng: lượt chạy 232 tình huống đạt 231, còn một kiểm thử desktop bị kẹt do dừng đồng hồ trước khi giao diện khởi tạo. Đã sửa fixture thời gian; chạy lại đúng trường hợp đổi kỳ đạt 2/2 desktop/mobile. Không còn lỗi chưa xử lý trong phạm vi này.
- Ma trận 12 màn ở 320/390/768/1280px, VI/EN, sáng/tối; kiểm tra overflow, tải giao diện, lỗi JavaScript và giảm chuyển động: đạt. Ảnh dùng dữ liệu giả lập, liên kết trong PRODUCT.md.
- Sau yêu cầu giữ ba cột: production build đạt; lượt E2E 108 trường hợp đạt 104, bốn trường hợp còn lại do hai kỳ vọng cũ không có cột ví và hai fixture xếp hạng thiếu trường bắt buộc. Đã cập nhật kỳ vọng và fixture theo API; chạy lại bốn trường hợp đạt 4/4. Kiểm tra vị trí ba cột desktop, xếp dọc mobile, tiến độ chỉ tính khả dụng, căn phải bốn số Xu và đổi Xu tại khu xanh đều đạt. Ảnh bàn giao đã cập nhật bố cục ba cột.
- CSP: development 4/4 đạt; production 2/2 đạt, bỏ qua đúng hai trường hợp HMR chỉ áp dụng development.
- Backend: bộ unit/integration đầy đủ chạy tuần tự với REQUIRE_DB_TESTS=1, REQUIRE_BROWSER_FIXTURES=1, database hoanxu_test trên localhost và Chrome fixture: đạt; Go vet đạt. Resolver vn.shp.ee, trạng thái Hữu ích theo người xem và migration FAQ giữ câu trả lời tùy chỉnh đều được kiểm tra.

Bằng chứng E2E chính: `tests/results/e2e-1791388367913-18136`; kiểm tra lại đổi kỳ: `tests/results/e2e-1791388517580-26056`. Kiểm thử chính loại các trường hợp chỉnh sửa chính sách quản trị đang thuộc đợt thay đổi khác; không coi đây là kết quả của toàn bộ bộ E2E quản trị.

Bằng chứng kiểm tra ba cột: `tests/results/e2e-1791391949293-37596`; chạy lại bốn trường hợp và ảnh cập nhật: `tests/results/e2e-1791392177446-27952`.

## Bổ sung ngày 08/10/2026

Tổng quan hiển thị đầy đủ điểm danh nhận Xu xanh, gồm chuỗi, kỷ lục, tiến độ, bốn mốc thưởng và quy tắc; dùng lại cùng component của `/checkin`. Giữ bố cục ba cột. Production build đạt; E2E 6/6 đạt, kiểm tra nhận thưởng một lần trên cả hai trang và ma trận VI/EN/sáng/tối ở 320/390/768/1280px. Bằng chứng: `tests/results/e2e-1791392734551-34476`; ảnh Tổng quan bàn giao đã cập nhật.

## Trước phát hành

- Nghiệm thu với link Shopee còn hoạt động trên Android và iPhone; kiểm tra kết quả tạo, mở mua và ghi nhận thực tế. Fixture không thay thế nghiệm thu trên thiết bị thật.
- Đăng nhập/đăng xuất nội bộ, điều hướng và VI/EN đã kiểm tra. Bộ E2E quản trị đầy đủ cần chạy cùng đợt thay đổi quản trị đang thực hiện đồng thời.
- Thử 5 người mới theo tiêu chí 4/5 trong PRODUCT.md. Đo thành công từng việc và ghi câu/nhãn gây nhầm; không coi E2E là nghiên cứu người dùng.
- Khi phát hành, chạy migration FAQ trong quy trình triển khai hiện có; kiểm tra nội dung tùy chỉnh vẫn nguyên và kênh hỗ trợ đã cấu hình.

## Sau phản hồi thực tế

Ưu tiên sửa chỗ khách nhầm giữa link và đơn, tiền dự kiến và khả dụng, hai loại Xu. Chỉ thay nghiệp vụ tài chính hoặc thưởng bằng quyết định sản phẩm riêng có căn cứ. Chưa có analytics/hành vi kết nối cho đợt thiết kế này.

## Triển khai quản trị

Đã triển khai khung/menu theo quyền → tài khoản/ô tick quyền và API độc lập → đơn hàng/rút tiền → khách hàng/CSV/thông báo/quà/thưởng/cài đặt/Shopee/nhật ký. OpenAPI hai repo đồng bộ, sinh lại kiểu frontend; cache cập nhật sau mutation. Giữ URL và nghiệp vụ tài chính hiện hữu; không cần migration cho admin.

Kiểm chứng admin gồm tạo nhiều/không quyền/admin, đổi quyền không đổi mật khẩu, reset không đổi quyền, khóa/mở khóa, thu hồi phiên, CSRF/quyền URL/API, cả hai nhóm khách, CSV nhiều trang, người nhận thông báo, tải bằng chứng/lỗi/xác thực lại/thử lại không trùng; kiểm tra sáng/tối/bàn phím tại 375/768/1440px. Kết quả và ảnh trước/sau ở [Bàn giao admin](docs/admin-redesign.md).

Trước phát hành còn nghiệm thu với admin thật năm việc: tìm đơn, xử lý rút tiền, tìm khách cũ, tạo nhân viên, đổi quyền. Đo tối đa hai lần chọn menu, không nhập chuỗi quyền hoặc sao chép ID bằng chứng; ghi chỗ nhầm để sửa. Hoàn tất lỗi kiểm thử còn tồn đọng được ghi trong bàn giao trước khi xác nhận đủ điều kiện phát hành. Chưa có kết quả thử người dùng hoặc thay đổi production cho phần admin.
