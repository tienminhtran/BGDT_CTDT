import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Trạng thái tài khoản - khớp CHECK constraint dưới DB và hằng ở backend.
export const TRANG_THAI = { HOAT_DONG: 'HoatDong', KHOA: 'Khoa' }

// Đăng nhập -> { token, nguoiDung: { Manhansu, hoten, trangthai } }
export const login = async (manhansu, matkhau) => {
  const { data } = await http.post(ENDPOINTS.users.login, { manhansu, matkhau })
  return data
}

// Danh sách tài khoản: [{ Manhansu, hoten, trangthai }] (không kèm mật khẩu)
export const list = async () => {
  const { data } = await http.get(ENDPOINTS.users.list)
  return data.items || []
}

export const create = async ({ manhansu, hoten, matkhau }) => {
  const { data } = await http.post(ENDPOINTS.users.create, { manhansu, hoten, matkhau })
  return data
}

export const remove = async (manhansu) => {
  const { data } = await http.delete(ENDPOINTS.users.remove(manhansu))
  return data
}

// Khóa / mở khóa tài khoản.
export const doiTrangThai = async (manhansu, trangthai) => {
  const { data } = await http.patch(ENDPOINTS.users.trangThai(manhansu), { trangthai })
  return data
}

// Cấp lại mật khẩu cho 1 tài khoản (không cần mật khẩu cũ).
export const datLaiMatKhau = async (manhansu, matkhau) => {
  const { data } = await http.patch(ENDPOINTS.users.matKhau(manhansu), { matkhau })
  return data
}
