import { Menu } from 'lucide-react'
import logo from '../assets/logo-white.svg'

// Header cố định trên cùng: logo + tên hệ thống, kèm nút thu/mở menu trái.
// App giảng viên không có đăng nhập nên bên phải chỉ hiển thị vai trò.
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

        <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
          Phòng đào tạo
        </span>
      </header>

      <div className="pt-14">{children}</div>
    </div>
  )
}
