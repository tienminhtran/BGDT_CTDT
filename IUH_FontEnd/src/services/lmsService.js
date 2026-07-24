import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Các API chỉ có ở lớp giao diện web của LMS. Backend giữ phiên web (MoodleSession
// + sesskey) tạo lúc đăng nhập rồi gọi hộ; FE chỉ cần gửi Bearer token như thường.
//
// Lỗi 409 kèm code 'NO_WEB_SESSION' = phiên web hết hạn/không tạo được
// -> phải mời SV đăng nhập lại, không tự khôi phục được.

// Lấy sesskey hiện tại (khi cần tự dựng link/gọi thêm).
export const getSesskey = async () => {
  const { data } = await http.get(ENDPOINTS.lms.sesskey)
  return data // { sesskey, userid }
}

// Gọi một web service nội bộ của Moodle. methodname phải nằm trong allowlist của backend.
export const callAjax = async (methodname, args = {}) => {
  const { data } = await http.post(ENDPOINTS.lms.ajax, { methodname, args })
  return data.data
}

// Mở modal đổi mật khẩu: hỏi trước đã tới ngưỡng phải nhập captcha chưa.
// silent: chạy nền lúc mở modal, không bật loading toàn cục.
export const getChangePasswordStatus = async () => {
  const { data } = await http.get(ENDPOINTS.lms.changePasswordStatus, { silent: true })
  return data // { captchaRequired }
}

// Đổi mật khẩu LMS. Thành công -> phiên hiện tại không dùng tiếp được, phải đăng nhập lại.
// captcha (tùy chọn) = { captchaToken, captchaText } — bắt buộc sau khi sai 2 lần
// (backend trả 428 kèm captchaRequired=true).
export const changePassword = async (oldPassword, newPassword, captcha) => {
  const { data } = await http.post(ENDPOINTS.lms.changePassword, {
    oldPassword,
    newPassword,
    ...(captcha || {}),
  })
  return data // { message, relogin }
}
