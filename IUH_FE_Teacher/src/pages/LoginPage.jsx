import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { LogIn, Lock, User } from 'lucide-react'
import logo from '../assets/logo-white.svg'
import { ROUTES } from '../constants'
import { useAuthStore } from '../store/authStore'

/**
 * Trang đăng nhập của app giảng viên.
 *
 * TẠM THỜI chưa xác thực: bấm "Đăng nhập" là vào thẳng, không gọi API và không
 * kiểm tài khoản/mật khẩu (ô nhập chỉ để sẵn giao diện). Sau khi vào, quay lại
 * đúng trang người dùng định mở (RequireAuth gửi kèm ở state.from).
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { daDangNhap, dangNhap } = useAuthStore()

  const [taiKhoan, setTaiKhoan] = useState('')
  const [matKhau, setMatKhau] = useState('')

  // Đã đăng nhập mà vẫn vào /login -> đẩy thẳng vào trang chủ.
  if (daDangNhap) return <Navigate to={ROUTES.home} replace />

  const guiForm = (e) => {
    e.preventDefault()
    dangNhap()
    navigate(location.state?.from?.pathname || ROUTES.home, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={guiForm}
        className="w-full max-w-sm overflow-hidden border border-slate-200 bg-white shadow-lg"
      >
        <div className="bg-[#115EA8] px-6 py-5 text-center text-white">
          <img src={logo} alt="IUH" className="mx-auto w-32 object-contain" />
          <p className="mt-2 text-sm font-medium opacity-90">
            Trang quản lý Bài Giảng Điện Tử
          </p>
        </div>

        <div className="space-y-3 p-6">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Tài khoản</span>
            <span className="flex items-center gap-2 border border-slate-300 px-3 py-2 transition focus-within:border-[#115EA8] focus-within:ring-2 focus-within:ring-[#115EA8]/20">
              <User size={16} className="shrink-0 text-slate-400" />
              <input
                value={taiKhoan}
                onChange={(e) => setTaiKhoan(e.target.value)}
                placeholder="Mã giảng viên"
                autoComplete="username"
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Mật khẩu</span>
            <span className="flex items-center gap-2 border border-slate-300 px-3 py-2 transition focus-within:border-[#115EA8] focus-within:ring-2 focus-within:ring-[#115EA8]/20">
              <Lock size={16} className="shrink-0 text-slate-400" />
              <input
                type="password"
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="min-w-0 flex-1 text-sm outline-none"
              />
            </span>
          </label>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 bg-[#115EA8] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4a82]"
          >
            <LogIn size={16} /> Đăng nhập
          </button>

          <p className="text-center text-xs text-slate-400">
            Chưa nối xác thực — bấm Đăng nhập để vào hệ thống.
          </p>
        </div>
      </form>
    </div>
  )
}
