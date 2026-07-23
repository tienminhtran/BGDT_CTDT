import axios from 'axios'
import { API_BASE_URL, STORAGE_KEYS } from '../constants'
import { startRequest, endRequest } from './loadingStore'

// Axios instance dùng chung cho toàn app.
const http = axios.create({
  baseURL: API_BASE_URL,
  // Bắt buộc để trình duyệt lưu/gửi cookie HttpOnly hls_<id> khi backend khác origin.
  withCredentials: true,
})

// Tự gắn JWT vào mọi request nếu có, đồng thời ghi nhận request vào bộ đếm loading toàn cục.
// Cửa thoát: gọi http.get(url, { silent: true }) để request "âm thầm" (polling nền, auto-save...)
// không bật loading toàn cục, tránh nhấp nháy vì việc người dùng không cần thấy.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (!config.silent) {
    config.__counted = true // đánh dấu để lúc kết thúc chỉ giảm đúng 1 lần
    startRequest()
  }
  return config
})

// Giảm bộ đếm khi request kết thúc — cả nhánh thành công lẫn lỗi đều phải giảm,
// nếu không loading sẽ kẹt hiển thị mãi khi có lỗi mạng/timeout.
const settle = (config) => {
  if (config && config.__counted) {
    config.__counted = false
    endRequest()
  }
}

http.interceptors.response.use(
  (response) => {
    settle(response.config)
    return response
  },
  (error) => {
    settle(error.config)
    return Promise.reject(error)
  }
)

export default http
