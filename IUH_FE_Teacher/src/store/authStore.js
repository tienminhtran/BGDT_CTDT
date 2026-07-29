import { create } from 'zustand'

/**
 * Phiên đăng nhập của app giảng viên.
 *
 * Đăng nhập thật qua POST /api/users/login (bảng tb_login_bgdt) -> nhận JWT.
 * Token lưu ở sessionStorage: F5 không bị văng ra, đóng tab là hết phiên.
 *
 * Cố ý dùng sessionStorage chứ không localStorage để token không sống dai trên
 * máy dùng chung; đổi lại mở tab mới thì phải đăng nhập lại.
 */
const KHOA_TOKEN = 'iuh_teacher_token'
const KHOA_NGUOI_DUNG = 'iuh_teacher_nguoi_dung'

function docNguoiDung() {
  try {
    return JSON.parse(sessionStorage.getItem(KHOA_NGUOI_DUNG) || 'null')
  } catch {
    return null // dữ liệu hỏng -> coi như chưa đăng nhập
  }
}

export const useAuthStore = create((set) => ({
  token: sessionStorage.getItem(KHOA_TOKEN) || null,
  nguoiDung: docNguoiDung(),
  daDangNhap: !!sessionStorage.getItem(KHOA_TOKEN),

  // Gọi sau khi API login trả về thành công.
  dangNhap: ({ token, nguoiDung }) => {
    sessionStorage.setItem(KHOA_TOKEN, token)
    sessionStorage.setItem(KHOA_NGUOI_DUNG, JSON.stringify(nguoiDung || null))
    set({ token, nguoiDung: nguoiDung || null, daDangNhap: true })
  },

  dangXuat: () => {
    sessionStorage.removeItem(KHOA_TOKEN)
    sessionStorage.removeItem(KHOA_NGUOI_DUNG)
    set({ token: null, nguoiDung: null, daDangNhap: false })
  },
}))

// Truy cập ngoài React: axios interceptor không nằm trong component nên không dùng
// được hook. Đọc thẳng từ store để luôn khớp lần đăng nhập mới nhất.
export const layToken = () => useAuthStore.getState().token
export const dangXuatNgay = () => useAuthStore.getState().dangXuat()
