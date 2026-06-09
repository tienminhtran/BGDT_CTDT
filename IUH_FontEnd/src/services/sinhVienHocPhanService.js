import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Lưu lần đầu các học phần hiện có vào DB (idempotent, không chặn UI).
export const importHocPhan = () => http.post(ENDPOINTS.sinhVienHocPhan.import)

// Kiểm tra sinh viên có quyền học môn này không. Trả về boolean.
export const kiemTraQuyen = async (maMon) => {
  const { data } = await http.get(ENDPOINTS.sinhVienHocPhan.kiemTra(maMon))
  return !!data.allowed
}
