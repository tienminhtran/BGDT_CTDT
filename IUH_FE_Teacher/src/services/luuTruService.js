import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Nội dung 1 cấp thư mục trên MinIO: { prefix, thuMuc: [...], file: [...] }
export const lietKe = async (prefix = '') => {
  const { data } = await http.get(ENDPOINTS.storage.list, { params: { prefix } })
  return data
}

// Tổng số file + dung lượng của 1 nhánh: { bucket, prefix, soFile, kichThuoc }
export const tongKet = async (prefix = '') => {
  const { data } = await http.get(ENDPOINTS.storage.summary, { params: { prefix } })
  return data
}
