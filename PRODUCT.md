# Giao diện khách hàng Hoàn Xu

Mục tiêu: người mới tự hoàn thành dán link → mua trên Shopee → theo dõi đơn → nhận tiền hoàn → rút tiền. Điểm danh, quà và cộng đồng hỗ trợ luồng chính.

Quyết định ngày 07/10/2026 dựa trên yêu cầu chủ sản phẩm, mã nguồn và kiểm tra giao diện. Chưa có dữ liệu hành vi hoặc thử với người mới; kiểm tra tự động không chứng minh người mới sử dụng thành công.

## Điều hướng và cách gọi

Desktop: Tổng quan · Lấy link hoàn tiền · Đơn hàng · Ví của tôi · Khám phá. Mobile: Tổng quan · Lấy link · Đơn hàng · Ví · Thêm. Hướng dẫn, tài khoản và tùy chọn nằm ở nhóm phụ; lịch sử ví thuộc Ví, các mục bổ trợ thuộc Khám phá.

- Tổng quan giữ khối vé xanh, linh vật lợn vòi và nguyên văn: “Dán link sản phẩm, nhận link hoàn tiền”, “Mua sắm thả ga, tích Xu đổi quà.”, “Link sản phẩm Shopee”, “Lấy link hoàn tiền”, “Tích lũy”, “Sắm món mình mê, rước quà mang về.”. Trên màn hẹp, linh vật xuống dải dưới để ô nhập và nút có đủ chiều rộng.
- Tổng quan và Lấy link chia sẻ trạng thái trong phiên điều hướng. Sửa/xóa link hoặc đổi tài khoản loại kết quả cũ. Tiền hoàn dự kiến dùng đồng, không tăng số dư khả dụng. Sau tạo link: Mở Shopee để mua là hành động chính, Sao chép link là hành động phụ.
- Link vừa tạo và link đã lưu có Sao chép link và Chia sẻ QR. Link chuẩn `https://s.shopee.vn/<mã>` được chia sẻ dưới dạng `https://<tên-miền-web>/shopee/<mã>`; link có tham số hoặc dạng khác giữ nguyên. Đường dẫn chia sẻ trả 302 trực tiếp sang Shopee, không tra database và không yêu cầu đăng nhập. QR tải khi mở hộp thoại, có tải PNG 1024 × 1024 và chia sẻ ảnh nếu thiết bị hỗ trợ. Xóa/hết hạn bản ghi không chặn chuyển hướng của link đã gửi; Shopee quyết định hiệu lực tracking gốc.
- Đơn hàng mặc định Tất cả; Link đã tạo, Chờ duyệt, Đã duyệt, Hủy / không được hoàn phân biệt link với đơn đã ghi nhận. Link hết hạn không được mô tả như đơn mua bị từ chối.
- Theo bổ sung mới nhất của chủ sản phẩm, giữ bố cục ba cột trên desktop: menu trái, nội dung giữa, ví/quyền lợi bên phải. Dưới 1200px, khu bên phải xuống dưới nội dung; mobile xếp một cột. Đăng nhập và trang không tồn tại giữ bố cục gọn. Tiến độ ví bên phải chỉ tính khả dụng, không cộng khoản chờ duyệt hoặc tiền dự kiến. Có thể rút dùng icon vàng; Dùng đổi quà dùng icon xanh. Bốn khoản chi tiết Xu vàng căn phải. Nút Đổi Xu vàng sang Xu xanh đặt trong khu xanh của Ví, mở xác nhận tại chỗ; `/wallet?exchange=1` vẫn hoạt động. Đổi quà cũng giữ thao tác đổi Xu phụ.
- Số dư và giao dịch dùng số + icon. Icon vàng có ngôi sao, xanh có lá, có tên cho trình đọc màn hình và chú giải khi chạm. Khoản chờ duyệt, giữ để rút và khoản thiếu tách riêng; tiến độ rút chỉ tính khả dụng.
- Lịch sử ví `/history`: Giao dịch · Rút tiền · Quà đã đổi. Theo bổ sung ngày 08/10/2026, Tổng quan hiển thị đầy đủ điểm danh nhận Xu xanh: chuỗi hiện tại, kỷ lục, nút nhận Xu, tiến độ, bốn mốc thưởng và quy tắc giữ chuỗi. `/checkin` vẫn mở cùng nội dung đầy đủ. `/discover` dẫn đến Điểm danh, Đổi quà, Ưu đãi cộng đồng, Bảng xếp hạng.
- Ưu đãi cộng đồng thu gọn biểu mẫu Chia sẻ ưu đãi; một nút Hữu ích có trạng thái. Bảng xếp hạng ưu tiên kỳ, vị trí cá nhân và bảng; biểu đồ mở theo yêu cầu. Bảng tóm tắt chỉ tên và Xu; bảng chi tiết giữ số đơn.
- Hướng dẫn & hỗ trợ có ba bước mua hàng, lưu ý, công dụng hai loại Xu và FAQ; chỉ dùng kênh hỗ trợ đã cấu hình. Tài khoản tách hồ sơ, ngân hàng, bảo mật; dùng “Đăng xuất phiên này”.
- `/login` dùng giao diện khách, hiện trực tiếp biểu mẫu tài khoản/mật khẩu và lựa chọn Google; `/internal/login` chuyển hướng về `/login`. Đăng nhập bằng mật khẩu thành công về `/account`; tài khoản `staff` và `admin` thấy nút “Vào trang quản trị” và dùng cùng phiên đăng nhập khi sang `/admin`. Tài khoản dùng mật khẩu tạm phải đổi mật khẩu trước, sau đó về `/account`. Khách chưa đăng nhập truy cập admin được chuyển về `/login`; role `customer` được chuyển về `/account`. Bản nháp trước Google chỉ lưu URL trong phiên tab, không lưu kết quả tài chính và không tự tạo link khi quay lại.

Giữ Next.js/React/CSS, Be Vietnam Pro, xanh thương hiệu và linh vật pixel. CSS khách giới hạn phạm vi, nền kem nhẹ, mặt trắng, giảm viền/bóng. Điều khiển chính tối thiểu 44px, ô nhập mobile 16px; có focus, trạng thái tải/trống/lỗi và giảm chuyển động. Lỗi dashboard không che ô tạo link.

## Đối chiếu tester hệ thống cũ

| Mục | Quyết định |
| --- | --- |
| 1. Trạng thái sàn | Đọc backend. Sàn hoạt động có nhãn cùng tên; sàn chưa cấu hình mờ, Chưa mở, không thao tác. |
| 2. Giảm thưởng / Pcoin | Bỏ qua. Giữ Xu xanh, thưởng ngày và chuỗi hiện tại. |
| 3. Mascot trống | Biểu cảm buồn nhẹ; thêm bước Lấy link hoàn tiền ở Đơn hàng. Mascot vé giữ nguyên. |
| 4. Bảng xếp hạng | Tên Bảng xếp hạng; tóm tắt tên + Xu, bảng chi tiết/API/quản trị giữ số đơn. |
| 5. Rút 20.000 | Bỏ qua. Giữ tối thiểu 50.000 Xu vàng khả dụng, bội 1.000, không có khoản thiếu. |
| 6. Link Android | Hỗ trợ chính xác vn.shp.ee, s.shopee.vn, link đầy đủ và đoạn chia sẻ một URL; nhiều URL yêu cầu chọn một. Chưa thêm shope.ee. |
| 7. Lưu ý | Dưới hướng dẫn mua; không yêu cầu dọn bộ nhớ hay khẳng định mua nhanh là bot. |
| 8. Ghi nhận đơn | Đơn xuất hiện sau khi nhận dữ liệu Shopee; tạo link chưa đồng nghĩa đơn đã ghi nhận. Không cam kết 24–48 giờ. |
| 9. Rút tiền | Chỉ dùng khả dụng; tiền chờ duyệt và Xu xanh không thể rút. |

Giữ toàn bộ nghiệp vụ thưởng, ngưỡng rút, xếp hạng, snapshot quyền lợi và dữ liệu tài chính. Đổi Xu một chiều, có bước xem lại và khóa chống gửi lặp. Resolver giữ HTTPS, kiểm tra từng chuyển hướng và IP công khai, giới hạn thời gian/số lần chuyển hướng. API kiểm tra/tạo giữ `{ url }`.

FAQ mặc định cập nhật qua migration `000031_customer_support`, chỉ khi câu hỏi/câu trả lời khớp bản cũ; giữ nội dung quản trị đã chỉnh. Migration đã kiểm thử trên database test riêng, chưa chạy trên production.

## Kiểm chứng và điều kiện phát hành

Kiểm tra tự động bao gồm input/resolver an toàn, bản nháp Google, dữ liệu chậm/lỗi/cũ, chuyển tài khoản, link/đơn/hết hạn, điều kiện rút, giữ tiền, đổi Xu một chiều, kết quả chưa rõ, điểm danh và tồn kho quà. Ma trận giao diện: 320/390/768/1280px, VI/EN, sáng/tối, bàn phím và giảm chuyển động. Typecheck, bản dịch, production build và CSP là điều kiện kỹ thuật.

Trước phát hành, thử với 5 người mới; mục tiêu ít nhất 4/5 tự tìm được tạo link, theo dõi đơn và rút tiền; phân biệt hai icon Xu, tiền dự kiến và khả dụng. Ghi chỗ nhầm để sửa. Đây là mục tiêu, chưa phải kết quả đã đo. Cần thử link còn hoạt động trên Android/iPhone với API Shopee thật.

Ảnh kiểm tra với dữ liệu giả lập: [Ví desktop](docs/customer-redesign/wallet-desktop.png), [Ví mobile chế độ tối](docs/customer-redesign/wallet-mobile-dark.png), [Tổng quan](docs/customer-redesign/overview-desktop.png).

Thứ tự và phần còn cần kiểm chứng: [ROADMAP.md](ROADMAP.md).

## Trang quản trị

Quản trị ưu tiên đơn hàng và rút tiền. Tổng quan quản trị đứng đầu; menu chia Vận hành, Khách hàng, Quà & cộng đồng, Hệ thống và tự ẩn theo quyền. Khách đăng ký/hệ thống cũ chung một mục Khách hàng, giữ URL cũ và bộ lọc khi quay lại. Danh sách gọn, chi tiết tài chính/mã kỹ thuật mở theo yêu cầu; form tạo/chỉnh chỉ mở khi cần, hỗ trợ sáng/tối, mobile và bàn phím.

Tài khoản nhân viên mặc định không quyền; cấp quyền bằng tám ô tick có mô tả. Admin có toàn quyền. Chỉnh quyền, đặt lại mật khẩu và khóa/mở khóa độc lập, giữ CSRF/xác thực gần đây/chặn tự thao tác/thu hồi phiên. Nhân viên không có audit vẫn vào được Tổng quan để xem việc thuộc quyền mình. Không thay công thức tiền/Xu/thuế hay quy tắc duyệt.

Rút tiền gắn bằng chứng tự động trong yêu cầu đang xử lý; xác nhận sau khi xem khách/ngân hàng/số tiền. Báo cáo CSV có xem trước và xác nhận nhập, phân trang dòng; thông báo tìm người nhận bằng tên/email. Nghiệm thu năm việc với admin thật trước phát hành, mục tiêu tìm đúng chức năng trong tối đa hai lần chọn menu và không nhập chuỗi quyền/ID tệp. Chi tiết, ảnh và kiểm thử: [Bàn giao admin](docs/admin-redesign.md).
