import axios from 'axios'
import { API_BASE_URL, TEACHER_KEY } from '../constants'

// Axios instance dùng chung cho toàn app giảng viên (không cần đăng nhập).
const http = axios.create({
  baseURL: API_BASE_URL,
})

// Gắn key giảng viên vào mọi request để backend cho qua (thay cho đăng nhập LMS).
if (TEACHER_KEY) {
  http.defaults.headers.common['x-teacher-key'] = TEACHER_KEY
}

export default http
