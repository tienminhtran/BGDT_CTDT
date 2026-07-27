import { create } from 'zustand'

/**
 * Trạng thái đăng nhập của app giảng viên.
 *
 * TẠM THỜI chưa xác thực thật: bấm nút "Đăng nhập" là vào, không gọi API, không
 * kiểm tài khoản/mật khẩu. Khi có API đăng nhập thì chỉ cần sửa `dangNhap` để
 * gọi API rồi lưu token — phần chặn route (RequireAuth) giữ nguyên.
 *
 * Cờ lưu ở sessionStorage: F5 không bị văng ra, nhưng đóng tab là hết phiên.
 */
const KHOA = 'iuh_teacher_da_dang_nhap'

export const useAuthStore = create((set) => ({
  daDangNhap: sessionStorage.getItem(KHOA) === '1',

  dangNhap: () => {
    sessionStorage.setItem(KHOA, '1')
    set({ daDangNhap: true })
  },

  dangXuat: () => {
    sessionStorage.removeItem(KHOA)
    set({ daDangNhap: false })
  },
}))
