import axios from 'axios'
import { API_BASE_URL, TEACHER_KEY, ROUTES } from '../constants'
import { layToken, dangXuatNgay } from '../store/authStore'

// Axios instance dùng chung cho toàn app giảng viên.
const http = axios.create({
  baseURL: API_BASE_URL,
  // Bắt buộc để trình duyệt lưu/gửi cookie HttpOnly hls_<id> khi backend khác origin.
  withCredentials: true,
})

// Key giảng viên dùng chung cho các API cũ (upload, đánh giá, thư mục...).
// Các API tài khoản (/users) KHÔNG dùng key này mà đòi JWT riêng của từng người.
if (TEACHER_KEY) {
  http.defaults.headers.common['x-teacher-key'] = TEACHER_KEY
}

// Gắn JWT của phiên đang đăng nhập vào mọi request. Đọc theo từng request (không
// set một lần lúc khởi tạo) để sau khi đăng nhập/đăng xuất là có hiệu lực ngay,
// không phải tải lại trang.
http.interceptors.request.use((config) => {
  const token = layToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Token hết hạn hoặc bị thu hồi -> dọn phiên và đưa về trang đăng nhập.
// Bỏ qua chính request đăng nhập: 401 ở đó nghĩa là sai mật khẩu, để form tự báo.
http.interceptors.response.use(
  (res) => res,
  (err) => {
    const laLoginRequest = err.config?.url?.includes('/users/login')
    if (err.response?.status === 401 && !laLoginRequest && layToken()) {
      dangXuatNgay()
      if (window.location.pathname !== ROUTES.login) {
        window.location.assign(ROUTES.login)
      }
    }
    return Promise.reject(err)
  }
)

export default http
