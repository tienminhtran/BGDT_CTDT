/**
 * Đặt tiêu đề tab trình duyệt (và mô tả) cho từng trang.
 *
 * Không dùng react-helmet: từ React 19, thẻ <title>/<meta> render ở bất kỳ đâu trong
 * cây component đều được tự động đưa lên <head>. Bản react-helmet gốc cũng đã ngừng
 * bảo trì và cảnh báo trên React 18+.
 *
 * QUAN TRỌNG với app này: các trang quản lý chạy keep-alive - MỌI tab đang mở đều
 * mount cùng lúc (xem KeepAliveOutlet), tab không xem chỉ bị ẩn bằng thuộc tính
 * hidden. Nếu đặt <title> trong từng trang đó thì sẽ có nhiều thẻ <title> tồn tại
 * song song và trình duyệt lấy thẻ ĐẦU TIÊN - tức tiêu đề của tab mở sớm nhất, không
 * phải tab đang xem.
 *
 * Vì vậy:
 *   - Trang quản lý  : KHÔNG tự đặt title. QuanLyLayout đặt một lần theo tab đang active.
 *   - Trang đứng riêng (đăng nhập, xem video): tự đặt title của mình, không xung đột.
 *
 * @param {string} [tieuDe] phần riêng của trang; bỏ trống thì chỉ hiện tên hệ thống
 * @param {string} [moTa]   nội dung thẻ <meta name="description">
 */

// Tên mặc định khi trang không truyền tiêu đề riêng.
const MAC_DINH = 'BGĐT - Giảng viên'

export default function TieuDeTrang({ tieuDe, moTa }) {
  return (
    <>
      <title>{tieuDe || MAC_DINH}</title>
      {moTa ? <meta name="description" content={moTa} /> : null}
    </>
  )
}
