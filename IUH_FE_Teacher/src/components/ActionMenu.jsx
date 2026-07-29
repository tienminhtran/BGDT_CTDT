import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Grid3x3 } from 'lucide-react'

/**
 * Menu "THAO TÁC" của 1 dòng bảng (giống grid ASP.NET của trường):
 * nút mở nằm ở cột hẹp bên TRÁI dòng, popup bung ra dưới - bên phải nút.
 * Click ra ngoài hoặc Esc thì đóng.
 *
 * Popup được đưa ra thẳng <body> bằng portal, định vị bằng position: fixed.
 * Lý do: DataTable bọc bảng trong hai lớp cắt nội dung (overflow-hidden ở khung
 * ngoài và overflow-x-auto ở khung bảng). Popup định vị absolute sẽ bị hai lớp đó
 * kẹp lại - các dòng cuối bảng thấy menu bị cắt cụt hoặc làm khung bảng phình ra
 * và sinh thanh cuộn. Ra ngoài body thì không còn tổ tiên nào cắt nữa.
 *
 * Vì tọa độ là fixed (theo khung nhìn), phải tính lại mỗi khi trang/bảng cuộn
 * hoặc đổi kích thước, nếu không menu sẽ đứng im còn nút thì trôi đi.
 *
 * @param {Array<{label, icon, onClick, danger?, disabled?}>} actions
 */

const LE = 8 // khoảng hở tối thiểu với mép màn hình
const CACH_NUT = 4 // khoảng cách giữa nút và menu

export default function ActionMenu({ actions = [] }) {
  const [mo, setMo] = useState(false)
  const [viTri, setViTri] = useState(null) // { top, left } theo khung nhìn
  const nutRef = useRef(null)
  const menuRef = useRef(null)

  const tinhViTri = useCallback(() => {
    const nut = nutRef.current
    const menu = menuRef.current
    if (!nut || !menu) return

    const r = nut.getBoundingClientRect()

    // Cuộn tới mức nút ra khỏi khung nhìn thì đóng luôn, nếu không menu sẽ lơ lửng
    // giữa màn hình trong khi dòng của nó đã trôi đi mất.
    if (r.bottom < 0 || r.top > window.innerHeight) {
      setMo(false)
      return
    }

    const { offsetHeight: cao, offsetWidth: rong } = menu

    // Không đủ chỗ phía dưới mà phía trên rộng rãi hơn -> lật lên trên.
    const duDuoi = window.innerHeight - r.bottom >= cao + LE
    const top = duDuoi || r.top < cao + LE ? r.bottom + CACH_NUT : r.top - cao - CACH_NUT

    // Kẹp theo chiều ngang để không tràn ra ngoài mép phải màn hình.
    const left = Math.max(LE, Math.min(r.left, window.innerWidth - rong - LE))

    setViTri({ top, left })
  }, [])

  // Đo sau khi menu đã vào DOM (useLayoutEffect chạy trước lượt vẽ nên không nháy).
  useLayoutEffect(() => {
    if (!mo) {
      setViTri(null)
      return
    }
    tinhViTri()

    // capture = true để bắt cả sự kiện cuộn BÊN TRONG khung bảng, không chỉ cuộn trang.
    window.addEventListener('scroll', tinhViTri, true)
    window.addEventListener('resize', tinhViTri)
    return () => {
      window.removeEventListener('scroll', tinhViTri, true)
      window.removeEventListener('resize', tinhViTri)
    }
  }, [mo, tinhViTri])

  useEffect(() => {
    if (!mo) return

    // Menu nằm ngoài cây DOM của nút (portal) nên phải kiểm tra CẢ HAI: thiếu
    // menuRef thì bấm vào chính menu cũng bị coi là click ra ngoài, menu đóng ngay
    // lúc mousedown và thao tác không bao giờ chạy.
    const ngoai = (e) => {
      if (nutRef.current?.contains(e.target)) return
      if (menuRef.current?.contains(e.target)) return
      setMo(false)
    }
    const esc = (e) => e.key === 'Escape' && setMo(false)

    document.addEventListener('mousedown', ngoai)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', ngoai)
      document.removeEventListener('keydown', esc)
    }
  }, [mo])

  if (!actions.length) return null

  return (
    <div className="flex justify-center">
      <button
        ref={nutRef}
        type="button"
        aria-label="Thao tác"
        aria-expanded={mo}
        onClick={() => setMo((v) => !v)}
        className={`rounded border p-1 transition ${
          mo
            ? 'border-[#115EA8] bg-[#115EA8] text-white shadow-sm'
            : 'border-slate-300 bg-white text-slate-400 hover:border-[#115EA8] hover:text-[#115EA8]'
        }`}
      >
        <Grid3x3 size={14} />
      </button>

      {mo &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              top: viTri?.top ?? 0,
              left: viTri?.left ?? 0,
              // Lượt vẽ đầu chưa biết kích thước thật để tính chỗ -> ẩn đi cho khỏi
              // thấy menu nhảy một nhịp từ góc trên trái.
              visibility: viTri ? 'visible' : 'hidden',
            }}
            className="fixed z-50 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          >
            <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wide text-[#115EA8] uppercase">
              Thao tác
            </p>
            {actions.map((a) => {
              const Icon = a.icon
              return (
                <button
                  key={a.label}
                  type="button"
                  disabled={a.disabled}
                  onClick={() => {
                    setMo(false)
                    a.onClick()
                  }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    a.danger
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-[#115EA8]/10 hover:text-[#115EA8]'
                  }`}
                >
                  {Icon && (
                    <Icon
                      size={15}
                      className={`shrink-0 ${a.danger ? 'text-red-500' : 'text-[#115EA8]'}`}
                    />
                  )}
                  {a.label}
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}
