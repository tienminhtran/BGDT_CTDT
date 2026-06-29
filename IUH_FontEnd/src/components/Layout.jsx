import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronFirst, ChevronUp, FlagTriangleLeft, Lightbulb, LogOut, MessageCircleQuestionMark, User, UserCircle2Icon } from 'lucide-react'
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width={20}
                      height={20}
                      viewBox="0 0 64 64"
                    >
                      <g>
                        <polygon
                          fill="none"
                          stroke="#0007c7"
                          strokeWidth={2}
                          strokeMiterlimit={10}
                          points="23,1 55,1 55,63 9,63 9,15  "
                        />
                        <polyline
                          fill="none"
                          stroke="#043eee"
                          strokeWidth={2}
                          strokeMiterlimit={10}
                          points="9,15 23,15 23,1  "
                          
                        />
                      </g>
                      <polygon
                        fill="none"
                        stroke="#bcbc00d8"
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeMiterlimit={10}
                        boder="1"
                      
                        points="32,39 25.875,43  28,36 22,32 29.213,32 32,24 35,32 42,32 36,36 37.938,43 "
                      />
                    </svg>
                    Đánh giá của bạn
                  </button>

                  {/* đăng xuất */}
                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 cursor-pointer"
                  >
                    <LogOut size={16} />
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
    </div>
  )
}
