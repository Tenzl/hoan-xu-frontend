"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarCheck, Medal, MessageCircle, Trophy } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card } from "./ui";
import { XuIcon } from "./xu-amount";

export function ShoppingGuide({ important = false }: { important?: boolean }) {
  const { t } = useI18n();
  return <Card title={t("Mua hàng nhận hoàn tiền trong 3 bước")}>
    <ol className="shopping-steps">
      <li><b>{t("Lấy link hoàn tiền")}</b><p>{t("Dán link sản phẩm Shopee và kiểm tra tiền hoàn dự kiến trước khi tạo link.")}</p></li>
      <li><b>{t("Mở Shopee để mua")}</b><p>{t("Mở link hoàn tiền vừa tạo để mua sản phẩm trên Shopee.")}</p></li>
      <li><b>{t("Theo dõi đơn và rút tiền")}</b><p>{t("Xem trạng thái trong Đơn hàng. Khi tiền hoàn được duyệt, xem số dư có thể rút trong Ví của tôi.")}</p></li>
    </ol>
    {important && <div className="shopping-notes"><h3>{t("Lưu ý quan trọng")}</h3><p>{t("Tạo link chưa đồng nghĩa với đơn đã được ghi nhận. Đơn xuất hiện sau khi Hoàn Xu nhận được dữ liệu từ Shopee.")}</p><p>{t("Tiền hoàn hiển thị trước khi mua là dự kiến. Đơn hủy hoặc không đáp ứng điều kiện ghi nhận có thể không được hoàn tiền.")}</p><p>{t("Chỉ rút từ Xu vàng khả dụng, tối thiểu 50.000 và theo bội số 1.000. Xu xanh dùng đổi quà; khoản chờ duyệt và đang giữ chưa thể rút.")}</p></div>}
  </Card>;
}

export function CoinGuide() {
  const { t } = useI18n();
  return <Card title={t("Hiểu hai loại Xu")}><div className="grid2 one coin-guide">
    <div><h3><XuIcon currency="gold"/>{t("Xu vàng · Có thể rút")}</h3><p>{t("Tiền hoàn đã duyệt vào số dư khả dụng. Khoản chờ duyệt, đang giữ và khoản thiếu được theo dõi riêng.")}</p></div>
    <div><h3><XuIcon currency="green"/>{t("Xu xanh · Dùng đổi quà")}</h3><p>{t("Nhận từ điểm danh hoặc đổi Xu vàng. Xu xanh không thể rút; việc đổi Xu vàng sang Xu xanh là một chiều.")}</p></div>
  </div></Card>;
}

export function Discover() {
  const { t } = useI18n();
  const entries = [
    ["/checkin", CalendarCheck, "Điểm danh nhận Xu xanh", "Điểm danh mỗi ngày, giữ chuỗi để nhận thêm Xu xanh."],
    ["/membership", Medal, "Quyền lợi thành viên", "Xem quyền lợi của bạn và mục tiêu lên hạng."],
    ["/deal", MessageCircle, "Ưu đãi cộng đồng", "Tìm ưu đãi và chia sẻ món hời bạn biết."],
    ["/top", Trophy, "Bảng xếp hạng", "Xem vị trí của bạn và phần thưởng theo kỳ."],
  ] as const;
  return <div className="discover-grid">{entries.map(([href, Icon, title, description]) => <Link key={href} href={href} className="discover-item"><Icon size={26} aria-hidden="true"/><div><h2>{t(title)}</h2><p>{t(description)}</p></div><ArrowUpRight size={18} aria-hidden="true"/></Link>)}</div>;
}
