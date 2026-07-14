import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Đăng nhập bằng tài khoản LMS (token.php). Trả về { token, user }.
// captcha (tùy chọn) = { captchaToken, captchaText } — bắt buộc sau khi sai mật khẩu nhiều lần
// (backend trả 428 kèm captchaRequired=true), hoặc 429 khi tài khoản đang bị tạm khóa.
export const login = async (username, password, captcha) => {
  const { data } = await http.post(ENDPOINTS.auth.login, {
    username,
    password,
    ...(captcha || {}),
  })
  return data
}

// Lấy 1 mã captcha mới: image là data URI base64 -> gán thẳng vào <img src>.
export const getCaptcha = async () => {
  const { data } = await http.get(ENDPOINTS.auth.captcha)
  return data // { captchaToken, image, expiresIn }
}

// Hỏi trước khi bấm đăng nhập: tài khoản này có đang bị khóa / có phải nhập captcha không.
export const getLoginStatus = async (username) => {
  const { data } = await http.get(ENDPOINTS.auth.loginStatus, { params: { username } })
  return data // { locked, retryAfter, captchaRequired }
}

// Lấy thông tin người dùng từ token đang lưu (kiểm tra token còn sống).
export const getCurrentUser = async () => {
  const { data } = await http.get(ENDPOINTS.auth.me)
  return data.user
}

// Xóa cookie phiên (sid) phía server. Gọi khi đăng xuất; lỗi cũng bỏ qua.
export const logout = async () => {
  try {
    await http.post(ENDPOINTS.auth.logout)
  } catch (_) {
    /* đăng xuất phía client vẫn tiếp tục dù API lỗi */
  }
}
