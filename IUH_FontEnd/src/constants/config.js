// Cấu hình chung của ứng dụng.
// Ưu tiên đọc từ biến môi trường Vite (.env) để dễ đổi khi deploy.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const LMS_BASE_URL = import.meta.env.VITE_LMS_BASE_URL || 'https://lms.iuh.edu.vn'

// Đường dẫn vào khóa học trên LMS gốc (Moodle).
export const buildLmsCourseUrl = (courseId) =>
  `${LMS_BASE_URL}/course/view.php?id=${courseId}`

// Thời gian sống tối đa của phiên đăng nhập: 2 giờ (tính từ lúc login).
// Quá hạn -> tự đăng xuất, bắt đăng nhập lại.
export const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000
// export const SESSION_MAX_AGE_MS = 2 * 60 * 1000 // 2 phút???