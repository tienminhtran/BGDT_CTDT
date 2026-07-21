import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { timMenuTheoPath, ROUTES } from '../constants'
import { useTabsStore, pathKeBen } from '../store/tabsStore'

/**
 * Thanh tab ngay dưới header: mỗi mục menu đã bấm là 1 tab được ghim lại.
 * Bấm tab -> điều hướng; bấm X -> đóng tab (đang xem thì nhảy sang tab kề bên).
 *
 * Nhiều tab thì KHÔNG hiện thanh cuộn ngang (xấu) -> ẩn scrollbar, thay bằng 2
 * nút trái/phải (chỉ hiện khi thật sự tràn).
 */
export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabs = useTabsStore((s) => s.tabs)
  const dongTab = useTabsStore((s) => s.dongTab)

  const boxRef = useRef(null)
  const [traiDuoc, setTraiDuoc] = useState(false)
  const [phaiDuoc, setPhaiDuoc] = useState(false)

  // Cập nhật trạng thái 2 nút theo vị trí cuộn (còn cuộn được sang trái / phải không).
  useEffect(() => {
    const el = boxRef.current
    if (!el) return

    const capNhat = () => {
      setTraiDuoc(el.scrollLeft > 1)
      setPhaiDuoc(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }

    // ResizeObserver gọi callback bất đồng bộ (sau layout) -> đo lần đầu ở đây,
    // tránh setState đồng bộ trong thân effect.
    const ro = new ResizeObserver(capNhat)
    ro.observe(el)
    el.addEventListener('scroll', capNhat)
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', capNhat)
    }
  }, [tabs.length])

  // Đổi tab -> kéo tab đang xem vào tầm nhìn (nếu đang nằm ngoài khung).
  useEffect(() => {
    boxRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [pathname, tabs.length])

  if (!tabs.length) return null

  const dong = (e, tab) => {
    e.stopPropagation() // đừng để click X kích hoạt luôn việc chuyển tab
    if (tab.fixed) return

    const ke = pathKeBen(tabs, tab.path)
    dongTab(tab.path)
    // Chỉ điều hướng khi đóng đúng tab đang xem.
    if (tab.path === pathname) navigate(ke || ROUTES.home)
  }

  const truot = (delta) => boxRef.current?.scrollBy({ left: delta, behavior: 'smooth' })

  const coTran = traiDuoc || phaiDuoc

  return (
    // sticky top-14: dính ngay dưới header (header fixed cao 3.5rem) khi cuộn trang
    <div className="sticky top-14 z-10 flex items-stretch border-b border-slate-200 bg-slate-100 pt-1.5">
      {coTran && (
        <NutTruot huong="trai" onClick={() => truot(-240)} disabled={!traiDuoc} />
      )}

      <div
        ref={boxRef}
        // Ẩn scrollbar (Firefox: scrollbar-width; WebKit: ::-webkit-scrollbar)
        className="flex flex-1 items-end gap-0.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const dangXem = tab.path === pathname
          const Icon = timMenuTheoPath(tab.path)?.icon

          return (
            <div
              key={tab.path}
              role="tab"
              tabIndex={0}
              data-active={dangXem}
              aria-selected={dangXem}
              title={tab.label}
              onClick={() => navigate(tab.path)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(tab.path)}
              className={`group flex shrink-0 cursor-pointer items-center gap-2 rounded-t border border-b-0 px-3 py-1.5 text-sm transition ${
                dangXem
                  ? 'border-slate-200 bg-white font-medium text-[#115EA8] shadow-[inset_0_2px_0_0_#115EA8]'
                  : 'border-transparent text-slate-500 hover:bg-slate-200/60'
              }`}
            >
              {Icon && <Icon size={14} className="shrink-0" />}
              <span className="max-w-[180px] truncate">{tab.label}</span>

              {/* Tab cố định (trang mặc định) không cho đóng -> chừa chỗ trống cho thẳng hàng */}
              {tab.fixed ? (
                <span className="w-3.5" />
              ) : (
                <button
                  type="button"
                  aria-label={`Đóng ${tab.label}`}
                  onClick={(e) => dong(e, tab)}
                  className="rounded p-0.5 text-slate-400 opacity-60 hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {coTran && (
        <NutTruot huong="phai" onClick={() => truot(240)} disabled={!phaiDuoc} />
      )}
    </div>
  )
}

// Nút cuộn trái/phải, bám mép, có viền ngăn cách với vùng tab.
function NutTruot({ huong, onClick, disabled }) {
  const trai = huong === 'trai'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={trai ? 'Cuộn tab sang trái' : 'Cuộn tab sang phải'}
      className={`flex shrink-0 items-center bg-slate-100 px-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-[#115EA8] disabled:text-slate-300 disabled:hover:bg-slate-100 ${
        trai ? 'border-r border-slate-200' : 'border-l border-slate-200'
      }`}
    >
      {trai ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  )
}
