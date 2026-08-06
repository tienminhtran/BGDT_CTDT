import axios from 'axios'
import { API_BASE_URL, STORAGE_KEYS } from '../constants'
import { ROUTES } from '../constants'
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

const HTTP_ERROR_STATUSES = new Set([403, 404, 500])

const redirectToHttpErrorPage = (error) => {
  const status = error?.response?.status
  const config = error?.config || {}

  if (!HTTP_ERROR_STATUSES.has(status)) return
  if (!config.showErrorPage) return
  if (typeof window === 'undefined') return
  if (window.location.pathname === ROUTES.httpError) return

  const params = new URLSearchParams()
  params.set('status', String(status))

  const message =
    error?.response?.data?.message ||
    (status === 403
      ? 'Máy chủ đã từ chối yêu cầu này.'
      : status === 404
        ? 'Không tìm thấy dữ liệu trên máy chủ.'
        : 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.')

  params.set('message', message)

  if (config.url) {
    params.set('source', String(config.url))
  }

  window.location.replace(`${ROUTES.httpError}?${params.toString()}`)
}

http.interceptors.response.use(
  (response) => {
    settle(response.config)
    return response
  },
  (error) => {
    settle(error.config)
    redirectToHttpErrorPage(error)
    return Promise.reject(error)
  }
)

export default http
