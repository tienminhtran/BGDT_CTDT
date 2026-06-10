import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Danh sách bình luận + sao của bài giảng kèm thống kê (công khai).
// Trả về { tongSoDanhGia, diemTrungBinh, phanBo, page, pageSize, danhSach }
export const getDanhGia = async (baiGiangId, { page = 1, pageSize = 20 } = {}) => {
  const { data } = await http.get(ENDPOINTS.danhGia.baiGiang(baiGiangId), {
    params: { page, pageSize },
  })
  return data
}

// Đánh giá của chính SV cho bài giảng (null nếu chưa có). Cần đăng nhập.
export const getDanhGiaCuaToi = async (baiGiangId) => {
  const { data } = await http.get(ENDPOINTS.danhGia.cuaToi(baiGiangId))
  return data.danhGia
}

// Tạo mới đánh giá (sao + bình luận). Cần đăng nhập.
export const taoDanhGia = async (baiGiangId, { soSao, binhLuan }) => {
  const { data } = await http.post(ENDPOINTS.danhGia.baiGiang(baiGiangId), {
    soSao,
    binhLuan,
  })
  return data.danhGia
}

// Sửa đánh giá của chính SV. Cần đăng nhập.
export const suaDanhGia = async (baiGiangId, { soSao, binhLuan }) => {
  const { data } = await http.put(ENDPOINTS.danhGia.baiGiang(baiGiangId), {
    soSao,
    binhLuan,
  })
  return data.danhGia
}
