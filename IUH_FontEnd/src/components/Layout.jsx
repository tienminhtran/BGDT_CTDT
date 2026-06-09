import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, User } from 'lucide-react'
import logo from '../assets/logo-white.svg'

export default function Layout({ user, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  // Đóng menu khi bấm ra ngoài
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {/* Header cố định luôn nằm trên cùng */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-[#115EA8] px-4 py-3 text-white shadow-sm">
        <span className="flex items-center gap-2 font-semibold" onClick={() => window.location.href = '/'}>
          <img src={logo} alt="IUH" className="w-28 object-contain" />
        </span>

        {/* Bấm vào tên -> xổ menu Đăng xuất */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm hover:bg-white/10"
            >
              <User size={16} />
              {/* Điện thoại: hiện MSSV (username); laptop: hiện họ tên đầy đủ */}
              <span className="sm:hidden">{user.username || user.fullname}</span>
              <span className="hidden sm:inline">{user.fullname}</span>
              <ChevronDown size={14} />
            </button>

            {open && (
              <div className="absolute right-0 z-20 mt-1 w-40 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                >
                  <LogOut size={16} />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Chừa khoảng trống bằng chiều cao header (py-3 + nội dung ≈ 56px) */}
      <div className="pt-14">{children}</div>
    </div>
  )
}
