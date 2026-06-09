import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Đăng nhập bằng tài khoản LMS (token.php). Trả về { token, user }.
export const login = async (username, password) => {
  const { data } = await http.post(ENDPOINTS.auth.login, { username, password })
  return data
}

// Lấy thông tin người dùng từ token đang lưu (kiểm tra token còn sống).
export const getCurrentUser = async () => {
  const { data } = await http.get(ENDPOINTS.auth.me)
  return data.user
}
