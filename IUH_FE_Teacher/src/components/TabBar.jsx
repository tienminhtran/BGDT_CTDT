import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { timMenuTheoPath, ROUTES } from '../constants'
import { useTabsStore, pathKeBen } from '../store/tabsStore'

/**
 * Thanh tab ngay dưới header: mỗi mục menu đã bấm là 1 tab được ghim lại.
 * Bấm tab -> điều hướng; bấm X -> đóng tab (đang xem thì nhảy sang tab kề bên).
 */
export default function TabBar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const tabs = useTabsStore((s) => s.tabs)
  const dongTab = useTabsStore((s) => s.dongTab)

  if (!tabs.length) return null

  const dong = (e, tab) => {
    e.stopPropagation() // đừng để click X kích hoạt luôn việc chuyển tab
    if (tab.fixed) return

    const ke = pathKeBen(tabs, tab.path)
    dongTab(tab.path)
    // Chỉ điều hướng khi đóng đúng tab đang xem.
    if (tab.path === pathname) navigate(ke || ROUTES.home)
  }

  return (
    // sticky top-14: dính ngay dưới header (header fixed cao 3.5rem) khi cuộn trang
    <div className="sticky top-14 z-10 flex items-end gap-0.5 overflow-x-auto border-b border-slate-200 bg-slate-100 px-2 pt-1.5">
      {tabs.map((tab) => {
        const dangXem = tab.path === pathname
        const Icon = timMenuTheoPath(tab.path)?.icon

        return (
          <div
            key={tab.path}
            role="tab"
            tabIndex={0}
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
  )
}
