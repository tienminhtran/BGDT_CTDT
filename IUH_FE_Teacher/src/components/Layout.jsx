import { Link } from 'react-router-dom'
import logo from '../assets/logo-white.svg'
import { ROUTES } from '../constants'

// Layout giảng viên: header đơn giản, không có đăng nhập / đăng xuất.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-[#479e05] px-4 py-3 text-white shadow-sm">
          <img src={logo} alt="IUH" className="w-28 object-contain" />
        <span className="text-sm font-medium opacity-90">Giảng viên</span>
      </header>

      {/* Chừa khoảng trống bằng chiều cao header (py-3 + nội dung ≈ 56px) */}
      <div className="pt-14">{children}</div>
    </div>
  )
}
