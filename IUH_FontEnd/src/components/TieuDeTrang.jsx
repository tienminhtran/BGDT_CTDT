/**
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
