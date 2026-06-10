// Cấu hình chung của app giảng viên.
// Ưu tiên đọc từ biến môi trường Vite (.env) để dễ đổi khi deploy.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
export const LMS_BASE_URL = import.meta.env.VITE_LMS_BASE_URL || 'https://lms.iuh.edu.vn'

// API key để upload video (gửi ở header x-api-key). Phải khớp UPLOAD_API_KEY của backend.
export const UPLOAD_API_KEY = import.meta.env.VITE_UPLOAD_API_KEY || ''

// Key giảng viên (gửi ở header x-teacher-key). Phải khớp KEY_LOGIN_TEACHER của backend.
// Cho phép app giảng viên xem/cấp token video mà không cần đăng nhập LMS.
export const TEACHER_KEY = import.meta.env.VITE_TEACHER_KEY || ''

// Đường dẫn vào khóa học trên LMS gốc (Moodle).
export const buildLmsCourseUrl = (courseId) =>
  `${LMS_BASE_URL}/course/view.php?id=${courseId}`
