import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, FileSpreadsheet, Star } from 'lucide-react'
import Layout from './Layout'
import { ROUTES } from '../constants'

// Các mục ở menu bên trái. `end` cho route "/" để không khớp mọi đường dẫn con.
const MENU = [
  {
    to: ROUTES.importHocPhan,
    label: 'Import Học phần – Môn học',
    hint: 'Nạp ánh xạ từ Excel',
    icon: FileSpreadsheet,
  },
  {
    to: ROUTES.home,
    end: true,
    label: 'Quản lý bài giảng',
    hint: 'Chọn môn, tải video lên',
    icon: BookOpen,
  },
  {
    to: ROUTES.danhGia,
    label: 'Quản lý đánh giá',
    hint: 'Sao, bình luận, lượt xem',
    icon: Star,
  },
]

// Khung dùng chung cho 3 trang quản lý: header + menu bên trái + nội dung (Outlet).
export default function QuanLyLayout() {
  return (
    <Layout>
      <main className="w-full px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Menu chức năng bên trái */}
          <aside className="shrink-0 lg:w-72">
            <nav className="sticky top-20  border border-slate-200 bg-white p-2 shadow-sm">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Chức năng
              </p>
              <ul className="space-y-1">
                {MENU.map((m) => {
                  const Icon = m.icon
                  return (
                    <li key={m.to}>
                      <NavLink
                        to={m.to}
                        end={m.end}
                        className={({ isActive }) =>
                          `flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition ${
                            isActive
                              ? 'bg-[#115EA8] text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              size={18}
                              className={`mt-0.5 shrink-0 ${isActive ? '' : 'text-slate-400'}`}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium leading-tight">
                                {m.label}
                              </span>
                              <span
                                className={`mt-0.5 block text-xs leading-tight ${
                                  isActive ? 'text-white/80' : 'text-slate-400'
                                }`}
                              >
                                {m.hint}
                              </span>
                            </span>
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </aside>

          {/* Nội dung trang con */}
          <section className="min-w-0 flex-1">
            <Outlet />
          </section>
        </div>
      </main>
    </Layout>
  )
}

// Tiêu đề dùng chung cho từng trang con.
export function PageHeading({ icon: Icon, title, desc }) {
  return (
    <div className="mb-5">
      <h1 className="flex items-center gap-2 text-xl font-semibold text-[#43a811]">
        <Icon size={22} /> {title}
      </h1>
      {desc && <p className="mt-1 text-sm text-gray-500">{desc}</p>}
    </div>
  )
}
