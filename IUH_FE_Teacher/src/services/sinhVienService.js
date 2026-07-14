import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Danh sách SV: [{ mssv, soHocPhan, soLanSai, dangKhoa, khoaConLai }]
export const list = async () => {
  const { data } = await http.get(ENDPOINTS.students.list)
  return data.items || []
}

// Xóa SV khỏi bảng học phần (SV sẽ không xem được bài giảng nào nữa).
export const remove = async (mssv) => {
  const { data } = await http.delete(ENDPOINTS.students.remove(mssv))
  return data
}

// Mở khóa đăng nhập (xóa khóa + bộ đếm số lần sai).
export const unlock = async (mssv) => {
  const { data } = await http.post(ENDPOINTS.students.unlock(mssv))
  return data
}
