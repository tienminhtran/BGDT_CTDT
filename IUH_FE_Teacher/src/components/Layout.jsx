import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Menu, UserCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo-white.svg'
import { ROUTES } from '../constants'
import { useAuthStore } from '../store/authStore'

// Header cố định trên cùng: logo + tên hệ thống, kèm nút thu/mở menu trái.
// Bên phải là menu tài khoản (vai trò + Đăng xuất) thả xuống khi bấm.
export default function Layout({ children, onToggleMenu }) {
  return (
    <div className="min-h-screen w-full bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-[#115EA8] px-3 text-white shadow-sm">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Thu gọn / mở rộng menu"
          className="rounded p-1.5 hover:bg-white/10"
        >
          <Menu size={20} />
        </button>

        <img src={logo} alt="IUH" className="w-28 object-contain" />

        <span className="hidden text-sm font-medium opacity-90 sm:block">
          Trang quản lý Bài Giảng Điện Tử
        </span>

        <MenuTaiKhoan />
      </header>

      <div className="pt-14">{children}</div>
    </div>
  )
}

/**
 * Menu tài khoản góc phải header: bấm để bung popup (vai trò + Đăng xuất).
 * Click ra ngoài hoặc Esc thì đóng — cùng cách cư xử với ActionMenu của bảng.
 */
function MenuTaiKhoan() {
  const navigate = useNavigate()
  const dangXuat = useAuthStore((s) => s.dangXuat)
  const [mo, setMo] = useState(false)
  const boc = useRef(null)

  useEffect(() => {
    if (!mo) return

    const ngoai = (e) => {
      if (!boc.current?.contains(e.target)) setMo(false)
    }
    const esc = (e) => e.key === 'Escape' && setMo(false)

    document.addEventListener('mousedown', ngoai)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', ngoai)
      document.removeEventListener('keydown', esc)
    }
  }, [mo])

  const thoat = () => {
    setMo(false)
    dangXuat()
    navigate(ROUTES.login, { replace: true })
  }

  return (
    <div ref={boc} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        aria-label="Menu tài khoản"
        aria-expanded={mo}
        className={`flex items-center gap-2 rounded-full px-2 py-1 text-sm font-medium transition ${
          mo ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        <UserCircle2 size={20} className="shrink-0" />
        <span className="hidden sm:block">Phòng đào tạo</span>
        <ChevronDown size={14} className={`transition-transform ${mo ? 'rotate-180' : ''}`} />
      </button>

      {mo && (
        <div className="absolute top-full right-0 z-40 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <UserCircle2 size={30} className="shrink-0 text-[#115EA8]" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-700">
                Phòng đào tạo
              </span>
              <span className="block truncate text-xs text-slate-400">Quản trị bài giảng</span>
            </span>
          </div>

          <button
            type="button"
            onClick={thoat}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
          >
            <LogOut size={15} className="shrink-0 text-red-500" />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  )
}
