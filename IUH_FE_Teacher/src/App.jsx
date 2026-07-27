import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES, MENU_ITEMS } from './constants'
import QuanLyLayout from './components/QuanLyLayout'
import RequireAuth from './components/RequireAuth'
import { CoursePlayerPage, VideoTheoIdPage, LoginPage } from './pages'

// App giảng viên: mọi trang đều phải qua /login (tạm thời bấm nút là vào, chưa xác thực).
//  - Các trang quản lý (mọi mục trong MENU_ITEMS) dùng chung QuanLyLayout.
//    Route con ở đây chỉ để KHỚP URL; việc render trang do KeepAliveOutlet lo,
//    vì trang của các tab đang mở phải cùng mount một lúc thì mới giữ được state.
//  - Trang xem video đứng riêng, không có menu:
//      "/bai-giang-dien-tu/:token" -> Xem theo token mờ (vẫn cần đăng nhập)
//      "/video/:id"                -> CÔNG KHAI: link gửi ra ngoài mở được, không cần đăng nhập
export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />
      <Route path={ROUTES.videoTheoId} element={<VideoTheoIdPage />} />

      <Route
        element={
          <RequireAuth>
            <QuanLyLayout />
          </RequireAuth>
        }
      >
        {MENU_ITEMS.map((m) => (
          <Route key={m.to} path={m.to} />
        ))}
      </Route>

      <Route
        path={ROUTES.coursePlayer}
        element={
          <RequireAuth>
            <CoursePlayerPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
