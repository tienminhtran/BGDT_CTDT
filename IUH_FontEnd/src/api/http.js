import axios from 'axios'
import { API_BASE_URL, STORAGE_KEYS } from '../constants'

// Axios instance dùng chung cho toàn app.
const http = axios.create({
  baseURL: API_BASE_URL,
  // Bắt buộc để trình duyệt lưu/gửi cookie HttpOnly hls_<id> khi backend khác origin.
  withCredentials: true,
})

// Tự gắn JWT vào mọi request nếu có.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default http
