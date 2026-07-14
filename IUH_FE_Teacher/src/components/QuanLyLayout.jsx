import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Layout from './Layout'
import TabBar from './TabBar'
import KeepAliveOutlet from './KeepAliveOutlet'
import { NHOM_MENU, timMenuTheoPath } from '../constants'
import { useTabsStore } from '../store/tabsStore'

// Từ lg trở lên coi là màn hình lớn (khớp breakpoint lg của Tailwind = 1024px).
const MAN_HINH_LON = '(min-width: 1024px)'

/**
 * Khung dùng chung cho các trang quản lý:
 *   header (Layout) + menu trái + thanh tab + nội dung (KeepAliveOutlet).
 *
 * Menu trái có 2 kiểu tùy màn hình, cùng dùng 1 nút hamburger trên header:
 *   - Desktop     : cột cố định, bấm để thu gọn còn icon (w-64 <-> w-16)
 *   - Điện thoại  : drawer trượt từ trái, có lớp phủ mờ; chọn xong tự đóng
 *
 * Vào path nào (bấm menu, bấm tab, gõ URL, back/forward) thì path đó được ghim
 * thành 1 tab -> chỉ cần theo dõi pathname, không cần bắt sự kiện click menu.
 */
export default function QuanLyLayout() {
  const { pathname } = useLocation()
  const moTab = useTabsStore((s) => s.moTab)

  const [thuGon, setThuGon] = useState(false) // desktop: chỉ còn icon
  const [moDrawer, setMoDrawer] = useState(false) // mobile: drawer đang mở

  useEffect(() => {
    const m = timMenuTheoPath(pathname)
    if (m) moTab({ path: m.to, label: m.label, fixed: !!m.fixed })
  }, [pathname, moTab])

  const toggleMenu = () => {
    if (window.matchMedia(MAN_HINH_LON).matches) setThuGon((v) => !v)
    else setMoDrawer((v) => !v)
  }

  return (
    <Layout onToggleMenu={toggleMenu}>
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Lớp phủ mờ khi drawer mở (chỉ có trên điện thoại) */}
        {moDrawer && (
          <div
            onClick={() => setMoDrawer(false)}
            className="fixed inset-0 top-14 z-20 bg-slate-900/40 lg:hidden"
          />
        )}

        {/* Menu chức năng bên trái */}
        <aside
          className={`fixed inset-y-0 top-14 left-0 z-20 w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white transition-transform duration-200 lg:sticky lg:z-0 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0 lg:transition-[width] ${
            moDrawer ? 'translate-x-0 shadow-xl' : '-translate-x-full'
          } ${thuGon ? 'lg:w-16' : 'lg:w-64'}`}
        >
          <nav className="py-2">
            {NHOM_MENU.map((nhom) => (
              <div key={nhom.tieuDe} className="mb-1">
                {/* Desktop thu gọn: bỏ tiêu đề nhóm, chỉ còn 1 vạch ngăn cách.
                    Trên điện thoại drawer luôn rộng nên vẫn hiện tiêu đề. */}
                <p
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 ${
                    thuGon ? 'lg:hidden' : ''
                  }`}
                >
                  {nhom.tieuDe}
                </p>
                {thuGon && (
                  <div className="mx-3 my-2 hidden border-t border-slate-200 lg:block" />
                )}

                <ul>
                  {nhom.items.map((m) => {
                    const Icon = m.icon
                    return (
                      <li key={m.to}>
                        <NavLink
                          to={m.to}
                          end={m.end}
                          title={m.label}
                          onClick={() => setMoDrawer(false)} // chọn xong -> đóng drawer (điện thoại)
                          className={({ isActive }) =>
                            `flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm transition ${
                              thuGon ? 'lg:justify-center lg:px-0' : ''
                            } ${
                              isActive
                                ? 'border-[#115EA8] bg-[#115EA8]/10 font-medium text-[#115EA8]'
                                : 'border-transparent text-slate-600 hover:bg-slate-50'
                            }`
                          }
                        >
                          <Icon size={18} className="shrink-0" />
                          <span className={`truncate ${thuGon ? 'lg:hidden' : ''}`}>
                            {m.label}
                          </span>
                        </NavLink>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Thanh tab + nội dung trang con */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TabBar />
          <section className="min-w-0 flex-1 p-3 sm:p-4 lg:p-6">
            <KeepAliveOutlet />
          </section>
        </div>
      </div>
    </Layout>
  )
}

