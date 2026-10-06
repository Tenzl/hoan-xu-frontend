# CSP và kiểm thử local

Policy của document nằm tại `src/lib/csp.ts`, được áp dụng qua `src/proxy.ts`.
Proxy tạo nonce mới và ghi đè cả `x-nonce` lẫn CSP do client gửi. Layout đọc
request headers để tất cả trang render động; Next.js cấp nonce cho script do
framework render. Không cache HTML theo cách tái sử dụng nonce giữa người dùng.

| Môi trường | CSS | JavaScript | Kết nối |
|---|---|---|---|
| Development | `self`, Google Fonts, `unsafe-inline`; không có style nonce | nonce, `strict-dynamic`, `unsafe-eval` phục vụ debug | `self`, WebSocket đúng origin/port hiện tại |
| Production local | `self`, Google Fonts, nonce; không có `unsafe-inline` | nonce, `strict-dynamic`; không có `unsafe-eval` | `self` |

Ngoại lệ development phục vụ CSS do Next DevTools/HMR chèn vào, tự hết hiệu lực
khi build production. Thêm nonce vào `style-src` development sẽ khiến browser
bỏ qua `unsafe-inline`, tái hiện lỗi ban đầu. JavaScript inline từ markup không
có nonce bị chặn trong cả hai môi trường. `strict-dynamic` cho phép script được
tin cậy tải các phụ thuộc của nó, theo cơ chế CSP chuẩn.

Component ứng dụng dùng CSS class/SVG attributes, không dùng `style={...}`.
Khóa cuộn của sidebar mobile dùng class `scroll-locked`. Nếu thêm thư viện chèn
style vào production, thư viện phải nhận nonce hoặc dùng stylesheet ngoài;
không mở `unsafe-inline` production để che lỗi.

Chạy từ thư mục frontend:

```powershell
npm.cmd run test:csp
```

Runner kiểm tra development tại **3011**, sau đó build và kiểm tra production
tại **3012**. Mỗi môi trường có build directory riêng `.next-csp-*`; không dùng
server đang chạy ở 3000. Playwright không tái sử dụng dịch vụ đang chiếm cổng.
`CSP_RUNTIME` phải khai báo rõ, không suy luận môi trường từ policy nhận được.
Kết quả/trace nằm tại `tests/results/csp-development` và `csp-production`.

Kiểm thử desktop/mobile xác nhận nonce đổi, header nonce giả bị ghi đè,
hydration, chuyển `/link → /help → /link`, reload và việc chặn markup script/style
không có nonce. CSS HMR được thay đổi bằng comment tạm, chờ sự kiện build rồi
xóa đúng comment đó. Không thử CSP bằng `page.evaluate` để chèn script:
DevTools có quyền đặc biệt nên cách đó không chứng minh việc chặn markup.

`content.js / No Listener` của mã chèn vào trình duyệt được xử lý riêng. Chỉ xem
là lỗi ứng dụng nếu tái hiện trong profile sạch. Không sửa CSP để cho phép
extension bất kỳ.
