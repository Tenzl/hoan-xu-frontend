# Đổi quà

## Giao diện khách hàng — 08/10/2026

Popup thêm/sửa quà có xem trước khung 16:9 giống thẻ voucher. Kéo ảnh lên/xuống bằng chuột hoặc cảm ứng để chọn phần cắt; có thanh trượt hỗ trợ bàn phím và nút Về giữa (50%). Vị trí `imagePositionY` (0–100) được lưu theo quà và dùng ở trang khách. Thay URL ảnh đặt lại giữa; chỉnh vị trí đánh dấu chưa lưu, điều khiển khóa khi đang gửi hoặc chưa rõ kết quả. Ảnh phủ kín khung bằng `object-fit: cover`.

Kiểm tra: 36 E2E desktop/mobile qua, gồm kéo chuột/cảm ứng, bàn phím, lưu/mở lại và crop đúng trên trang khách. TypeScript, bản dịch và build qua. Ảnh popup ở `docs/gift-redesign/image-editor-desktop.png` và `image-editor-mobile.png`. Migration 34 đã áp dụng local; API local cần khởi động lại với bản mới vì công cụ chặn thao tác dừng tiến trình.

Trang đổi quà dùng thẻ số dư Xu xanh, hướng dẫn ba bước và danh mục voucher hai cột trên desktop, một cột trên điện thoại. Ảnh quà, tồn kho, giá và nút đổi có phân cấp rõ ràng; giá và nút nằm ở cuối thẻ, lý do không thể đổi nằm ngay phía trên. Có liên kết điểm danh, chuyển Xu và lịch sử yêu cầu. Giữ font Be Vietnam Pro và màu xanh thương hiệu; CSS riêng tại `src/styles/gift-shop.css`, hỗ trợ giao diện sáng/tối, bàn phím và giảm chuyển động.

Luồng đổi quà, khóa giá, CSRF, idempotency và phục hồi lỗi giữ nguyên. Xác minh: production build, TypeScript, bản dịch và 24 E2E đổi quà/tích lũy Xu xanh qua trên desktop/mobile. Ảnh kiểm tra với dữ liệu giả lập tại `docs/gift-redesign/`; đã kiểm tra không tràn ngang ở desktop 1440px và mobile 390px/320px.

Hộp thoại đổi Xu vàng → Xu xanh nằm tại trang Đổi quà, mở qua `/gift?exchange=1`. Liên kết cũ `/wallet?exchange=1` chuyển tới trang này. Hạng Đồng/Bạch kim/Kim cương nhận thêm 5%/10%/15% so với tỷ lệ gốc; số nhận được làm tròn xuống một lần sau khi cộng thưởng. Khách xem hạng, tỷ lệ gốc và phần thưởng trước khi xác nhận. Backend yêu cầu xem lại nếu hạng hoặc chính sách thay đổi; gửi lại giao dịch đã thành công giữ kết quả ban đầu.

Ví và quản lý khách hiển thị **Tổng Xu vàng** từ đơn đã duyệt và **Đã sử dụng** từ vàng rút ngân hàng thành công cộng vàng đã chuyển đổi. Phần thưởng xanh không cộng vào hai số vàng. Chuyển đổi không làm giảm thành tích bảng xếp hạng.

Trang `/gift` đọc số dư khả dụng và Xu giữ cho quà từ `/wallet`. Danh sách `/gifts` hiển thị quà đang bật, giá Xu, tồn kho và lý do không thể đổi. Hai nguồn tự cập nhật mỗi 15 giây; lỗi tải ví khóa đổi và có nút thử lại. Giao diện có trạng thái tải, rỗng, lỗi, đang gửi và gửi thành công, hoạt động ở 320px và có bản dịch Việt/Anh.

`POST /gift-redemptions` gửi `giftId` và `expectedCostXu` bằng CSRF và Idempotency-Key. Backend kiểm tra giá dưới khóa transaction; giá thay đổi trả 409 `GIFT_PRICE_CHANGED`, không giữ Xu hay quà. Thành công cập nhật ví và danh sách, hiển thị Xu tạm giữ và liên kết `/history?tab=gifts`.

Lỗi mạng hoặc 5xx giữ nguyên yêu cầu, giá và khóa. Khách dùng **Kiểm tra yêu cầu** để thử lại; các nút tạo yêu cầu mới bị khóa trong lúc chưa rõ kết quả. Việc thử lại vẫn hoạt động khi kho/giá đã đổi, vì backend trả lại kết quả cũ theo khóa. Trạng thái này giữ trong phiên thao tác; tải lại toàn bộ trang có thể xem các yêu cầu đã ghi nhận ở lịch sử.

Quà hiện được cấp qua quản trị: hoàn thành cần nhập mã voucher; từ chối trả Xu và tồn kho. Không tự mua voucher Shopee. Câu “Hoàn tiền và Xu điểm danh cùng tích lũy vào ví. 1 Xu = 1đ.” đã bỏ khỏi trang.

Kiểm thử dùng API giả lập và DB riêng, không đổi quà hay chỉnh tồn kho trong DB sử dụng. Backend kiểm tra khóa giá, hoàn tác khi thiếu Xu, thử lại đồng thời, cấp mã mã hóa và quyền xem mã; E2E kiểm tra giao diện, cập nhật số dư, lỗi kho/ví/mạng, tải lại danh sách và chống gửi lại khác giá.


## Quản trị đổi quà

`/admin/gifts` có tab Yêu cầu đổi quà và Danh mục quà, thống kê yêu cầu pending/Xu giữ/quà còn hàng. Yêu cầu lọc trạng thái và quà tại backend, phân trang; danh mục và yêu cầu tự tải lại mỗi 15 giây. Thêm/sửa dùng panel, chọn một trong tám icon SVG, cập nhật giá hoặc kho nhanh. Sửa kho gửi expectedStock và tải lại số lượng nếu có xung đột; sửa giá không ghi đè kho.

Bấm Hết hàng và hoàn Xu thực hiện ngay hoàn mọi yêu cầu pending của quà đó, sau đó hiển thị số yêu cầu và tổng Xu đã hoàn. Nút vẫn dùng được khi kho bằng 0 nhưng còn yêu cầu pending. Có nút hoàn riêng từng yêu cầu vì hết hàng. Không có xóa quà/xóa mềm/tặng miễn phí. Cấp voucher có bản xem trước thông báo chứa tên khách và tên quà.

Gặp mạng/5xx chưa rõ kết quả thì khóa thao tác ghi mới và giữ payload/Idempotency-Key để Thử lại thao tác. Không tự gửi lại bằng khóa mới. Giá mới và icon hiển thị trên trang khách; quà hết hàng vẫn thấy nhưng khóa đổi. Kho tự về 0 do giữ món cuối không tự hoàn Xu.

Giao diện giữ font Be Vietnam Pro và màu thương hiệu, có trạng thái rỗng/tải/lỗi, theme sáng/tối, thao tác bàn phím, và kiểm thử desktop/mobile/320px/tiếng Anh. Cần backend đã áp dụng migration 000022 trước khi dùng API mới.


Xác minh 07/10/2026: 30 E2E đổi quà trên desktop/mobile đã qua. Bộ tổng có 276 ca qua, hai lỗi form phục hồi tồn kho đã được sửa và chạy lại thành công. Sau chỉnh focus và bật theme tối thực tế, chạy lại toàn bộ 10 ca quản trị quà đều qua; ảnh QA gồm catalog/editor và editor tối 320px. Typecheck, kiểm tra bản dịch, tests/scripts và production build đều qua.


## Popup ảnh và mô tả

Form thêm/sửa, giá/kho và cấp/từ chối quà dùng dialog modal ở giữa màn hình. Native dialog giữ focus trong popup, Escape/X đóng khi không đang gửi, phục hồi focus về nút mở và khóa cuộn trang nền. Có footer lưu cố định khi form dài; lỗi và nút thử lại nằm trong popup. Luồng xác thực lại mở dialog riêng phía trên và tiếp tục thao tác gốc.

Form danh mục bỏ kênh và bộ chọn SVG, nhận imageUrl HTTPS tùy chọn và mô tả văn bản thuần tối đa 2.000 ký tự. Có ảnh xem trước, thông báo lỗi ảnh và đếm ký tự. Khách xem ảnh riêng của từng quà, mô tả xuống dòng có Xem thêm/Thu gọn; ảnh lỗi/trống dùng biểu tượng mặc định. Không tải ảnh qua backend. Cần migration 000023_gift_details.


Xác minh popup 07/10/2026: 36 E2E đổi quà/thông báo đã qua; sau bổ sung footer và xác thực lại, 48 E2E quà/tài khoản/các trang quản trị đã qua trên desktop/mobile. Kiểm tra ảnh QA popup, theme tối 320px, Escape/focus, lỗi kho và ghi mô tả như văn bản thuần. Typecheck, bản dịch và build qua.

Sau hoàn thiện footer riêng (không chồng lên nội dung), chạy lại 18 E2E quản trị quà/tài khoản trên desktop/mobile đều qua. Popup dùng phần nội dung cuộn riêng và nút Đóng/Lưu ở chân cửa sổ.
