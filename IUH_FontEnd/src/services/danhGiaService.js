import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Thống kê đánh giá tổng hợp của bài giảng (công khai).
// Trả về { total, average, distribution } — KHÔNG có đánh giá của từng SV.
export const getDanhGia = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.reviews.byLecture(lectureId), {
    showErrorPage: true,
  })
  return data
}

// Đánh giá của chính SV cho bài giảng (null nếu chưa có). Cần đăng nhập.
export const getDanhGiaCuaToi = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.reviews.mine(lectureId), {
    showErrorPage: true,
  })
  return data.review
}

// Danh sách đánh giá của SV đang đăng nhập (kèm tên môn + bài giảng), có phân trang. Cần đăng nhập.
// filters (đều tùy chọn): { courseName, courseCode, videoTitle, stars, starsFrom, starsTo, dateFrom, dateTo }
// - dateFrom/dateTo dạng 'YYYY-MM-DD'; chỉ gửi field có giá trị.
// pagination: { page, pageSize } — mặc định BE trả trang 1, 15 dòng.
// Trả { reviews, total, page, pageSize, totalPages } (reviews đã enrich + sort mới nhất trước từ BE).
export const getDanhGiaCuaSinhVienList = async (filters = {}, pagination = {}) => {
  const params = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params[key] = value
  }
  if (pagination.page) params.page = pagination.page
  if (pagination.pageSize) params.pageSize = pagination.pageSize
  const { data } = await http.get(ENDPOINTS.reviews.my(), {
    params,
    showErrorPage: true,
  })
  return data
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
