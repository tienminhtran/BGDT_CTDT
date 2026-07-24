import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronFirst, ChevronUp, FlagTriangleLeft, Lightbulb, MessageCircleQuestionMark, User, UserCircle2Icon } from 'lucide-react'
import logo from '../assets/logo-white.svg'
import ChangePasswordModal from './ChangePasswordModal'

export default function Layout({ user, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const [doiMatKhau, setDoiMatKhau] = useState(false)
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
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-[#153898] px-4 py-3 text-white shadow-sm">
        <span className="flex items-center gap-2 font-semibold cursor-pointer" onClick={() => window.location.href = '/'}>
          <img src={logo} alt="IUH" className="w-28 object-contain" />
        </span>


        <div className="flex items-center">
          <div className="relative group inline-block">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded px-0.5 py-1.5 text-sm text-yellow-500 hover:text-yellow-200 focus:outline-none cursor-pointer"
            >
              <Lightbulb size={15} />
            </button>

            {/* Neo theo cạnh phải MÀN HÌNH (fixed) để không bị tràn/che trên điện thoại,
                thay vì neo theo nút (absolute) vốn lệch trái khi username dài. */}
            <div
              className="pointer-events-none fixed right-3 top-12 z-50 w-[min(18rem,calc(100vw-1.5rem))] rounded-sm bg-amber-600 p-3 text-xs text-amber-50 opacity-0 shadow-lg ring-1 ring-amber-800/50 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100"
            >
              <strong className="text-amber-200">💡Tips</strong>
              <p className="mt-1 leading-relaxed text-justify">
                Để tránh mất bài giảng khi LMS xóa môn học, hãy đánh giá bài giảng.
                Sau này bạn có thể xem lại trong mục <b className="text-amber-100">Đánh giá của bạn</b>.
              </p>

              {/* Mũi tên chỉ lên, canh gần cạnh phải nơi đặt nút bóng đèn */}
              <div className="absolute -top-1 right-3 h-2 w-2 rotate-45 bg-amber-600"></div>
            </div>
          </div>
          {/* Bấm vào tên -> xổ menu Đăng xuất */}
          {user && (
            <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  className="group flex items-center gap-1.5 rounded px-2 py-1.5 text-sm hover:text-yellow-300 cursor-pointer"
                >
                  <UserCircle2Icon size={20} />
                  <span className="sm:hidden">{user.username || user.fullname}</span>
                  <span className="hidden sm:inline">{user.fullname}</span>

                  <div className="relative h-[14px] w-[14px]">
                    <ChevronDown
                      size={14}
                      className="absolute transition-opacity duration-200 group-hover:opacity-0"
                    />
                    <ChevronUp
                      size={14}
                      className="absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                  </div>
                </button>

              {open && (
                <div className="absolute right-0 z-20 mt-1 w-40 bg-white py-1 shadow-lg rounded-b-md ">


                  {/* danh sách đánh giá  */}
                  <button
                    type="button"
                    onClick={() => (window.location.href = "/danh-gia")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-900 hover:bg-gray-50 cursor-pointer"
                  >
                    {/* Cùng khung thư mục với icon Đổi mật khẩu, ruột là ngôi sao vàng */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 20V4C2 3.44772 2.44772 3 3 3H8.44792C8.79153 3 9.11108 3.17641 9.29416 3.46719L10.5947 5.53281C10.7778 5.82359 11.0974 6 11.441 6H21C21.5523 6 22 6.44772 22 7V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20Z" stroke="#200E32" strokeWidth={1.4} />
                      <polygon
                        points="12,9 13.26,12.26 16.76,12.45 14.04,14.66 14.94,18.05 12,16.15 9.06,18.05 9.96,14.66 7.24,12.45 10.74,12.26"
                        fill="#FACC15"
                        stroke="#EAB308"
                        strokeWidth={1}
                        strokeLinejoin="round"
                      />
                    </svg>
                    Đánh giá của bạn
                  </button>

                  {/* Đổi mật khẩu */}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      setDoiMatKhau(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-blue-900 hover:bg-gray-50 cursor-pointer"
                  >
                    {/* Ổ khoá nền trắng, nét đen — đè lên nét thư mục cho rõ ruột icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 20V4C2 3.44772 2.44772 3 3 3H8.44792C8.79153 3 9.11108 3.17641 9.29416 3.46719L10.5947 5.53281C10.7778 5.82359 11.0974 6 11.441 6H21C21.5523 6 22 6.44772 22 7V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20Z" stroke="#200E32" strokeWidth={1.4} />
                      <path d="M10 12V11.5C10 10.3954 10.8954 9.5 12 9.5C13.1046 9.5 14 10.3954 14 11.5V12" stroke="#200E32" strokeWidth={1.2} strokeLinecap="round" />
                      <rect x="8.75" y="12.5" width="6.5" height="5" rx="0.8" fill="#fff" stroke="#200E32" strokeWidth={1.2} />
                    </svg>
                    Đổi mật khẩu
                  </button>

                  {/* đăng xuất */}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
                  >
                    {/* Cùng khung thư mục, ruột là mũi tên thoát ra — tô đỏ theo màu chữ */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 20V4C2 3.44772 2.44772 3 3 3H8.44792C8.79153 3 9.11108 3.17641 9.29416 3.46719L10.5947 5.53281C10.7778 5.82359 11.0974 6 11.441 6H21C21.5523 6 22 6.44772 22 7V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20Z" stroke="currentColor" strokeWidth={1.4} />
                      <path d="M10.5 10H8V17.5H10.5" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11.5 13.75H16.5M14.5 11.75L16.5 13.75L14.5 15.75" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          )}          
        </div>

      </header>

      {/* Chừa khoảng trống bằng chiều cao header (py-3 + nội dung ≈ 56px) */}
      <div className="pt-14">{children}</div>

      {/* Đổi mật khẩu LMS. Đổi xong thì mật khẩu cũ (đang gắn với phiên hiện tại)
          không còn giá trị -> đăng xuất để SV đăng nhập lại. */}
      {doiMatKhau && (
        <ChangePasswordModal
          onClose={() => setDoiMatKhau(false)}
          onDone={() => {
            setDoiMatKhau(false)
            onLogout()
          }}
        />
      )}
    </div>
  )
}
