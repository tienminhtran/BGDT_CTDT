import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Thống kê đánh giá tổng hợp của bài giảng (công khai, chỉ để hiển thị).
// Trả về { total, average, distribution }.
export const getDanhGia = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.reviews.byLecture(lectureId))
  return data
}
