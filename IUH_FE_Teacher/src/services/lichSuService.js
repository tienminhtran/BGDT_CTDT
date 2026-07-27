import http from '../api/http'
import { ENDPOINTS } from '../constants'

/**
 * Nhật ký thao tác bài giảng (tb_LichSuThayDoiBaiGiang).
 * Backend tự ghi khi upload/xóa video; FE chỉ đọc để hiển thị.
 */

// Toàn bộ nhật ký, mới nhất trước, kèm tên bài giảng + môn/phiên bản:
// [{ id, idBaiGiang, hanhDong, thoiGian, maNguoi, lyDo, diaChiIP,
//    tenBaiGiang, noiDungChuong, maTuQuan, tenMon, version }]
export const getTatCa = async (limit) => {
  const { data } = await http.get(ENDPOINTS.lectureHistory.list, {
    params: limit ? { limit } : undefined,
  })
  return data.items || []
}

// Nhật ký của riêng 1 bài giảng (không kèm thông tin môn).
export const getTheoBaiGiang = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.lectureHistory.byLecture(lectureId))
  return data.items || []
}
