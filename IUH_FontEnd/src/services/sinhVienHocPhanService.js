import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Lưu lần đầu các học phần hiện có vào DB (idempotent, không chặn UI).
export const importHocPhan = () => http.post(ENDPOINTS.studentCourses.import)

// Kiểm tra sinh viên có quyền học khóa (token mờ) này không. Trả về boolean.
export const kiemTraQuyen = async (courseToken) => {
  const { data } = await http.get(ENDPOINTS.studentCourses.access, {
    params: { course: courseToken },
  })
  return !!data.allowed
}
