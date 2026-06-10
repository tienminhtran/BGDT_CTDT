import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Danh sách môn học kèm các phiên bản (dùng cho trang Quản lý bài giảng).
export const getMonHoc = async () => {
  const { data } = await http.get(ENDPOINTS.subjects)
  return data.monHoc || []
}
