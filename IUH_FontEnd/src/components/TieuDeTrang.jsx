/**
 * Đặt tiêu đề tab trình duyệt (và mô tả) cho từng trang.
 *
 * Không dùng react-helmet: từ React 19, thẻ <title>/<meta> render ở bất kỳ đâu trong
 * cây component đều được tự động đưa lên <head>. Bản react-helmet gốc cũng đã ngừng
 * bảo trì và cảnh báo trên React 18+.
 *
 * LƯU Ý: nếu có nhiều component cùng render <title> tại một thời điểm, trình duyệt
 * lấy thẻ ĐẦU TIÊN. App này mỗi lúc chỉ hiển thị một trang nên đặt trực tiếp trong
 * từng page là an toàn.
 *
 * @param {string} [tieuDe] phần riêng của trang; bỏ trống thì chỉ hiện tên hệ thống
 * @param {string} [moTa]   nội dung thẻ <meta name="description">
 */

const HAU_TO = 'Bài giảng điện tử IUH'

export default function TieuDeTrang({ tieuDe, moTa }) {
  return (
    <>
      <title>{tieuDe ? `${tieuDe}` : HAU_TO}</title>
      {moTa ? <meta name="description" content={moTa} /> : null}
    </>
  )
}
