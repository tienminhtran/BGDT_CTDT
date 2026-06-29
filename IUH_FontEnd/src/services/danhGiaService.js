import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Thống kê đánh giá tổng hợp của bài giảng (công khai).
// Trả về { total, average, distribution } — KHÔNG có đánh giá của từng SV.
export const getDanhGia = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.reviews.byLecture(lectureId))
  return data
}

// Đánh giá của chính SV cho bài giảng (null nếu chưa có). Cần đăng nhập.
export const getDanhGiaCuaToi = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.reviews.mine(lectureId))
  return data.review
}

// Danh sách TẤT CẢ đánh giá của SV đang đăng nhập (kèm tên môn + bài giảng). Cần đăng nhập.
// Trả mảng đã enrich + sort mới nhất trước từ BE.
export const getDanhGiaCuaSinhVienList = async () => {
  const { data } = await http.get(ENDPOINTS.reviews.my())
  return data.reviews
}

// Tạo mới đánh giá (sao + bình luận). Cần đăng nhập.
export const taoDanhGia = async (lectureId, { stars, comment }) => {
  const { data } = await http.post(ENDPOINTS.reviews.byLecture(lectureId), { stars, comment })
  return data.review
}

// Sửa đánh giá của chính SV. Cần đăng nhập.
export const suaDanhGia = async (lectureId, { stars, comment }) => {
  const { data } = await http.put(ENDPOINTS.reviews.byLecture(lectureId), { stars, comment })
  return data.review
}
