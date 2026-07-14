import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES, MENU_ITEMS } from './constants'
import QuanLyLayout from './components/QuanLyLayout'
import { CoursePlayerPage, VideoTheoIdPage } from './pages'

// App giảng viên: KHÔNG đăng nhập.
//  - Các trang quản lý (mọi mục trong MENU_ITEMS) dùng chung QuanLyLayout.
//    Route con ở đây chỉ để KHỚP URL; việc render trang do KeepAliveOutlet lo,
//    vì trang của các tab đang mở phải cùng mount một lúc thì mới giữ được state.
//  - Trang xem video đứng riêng, không có menu:
//      "/bai-giang-dien-tu/:token" -> Xem theo token mờ
//      "/video/:id"                -> Xem 1 video riêng lẻ (tb_BaiGiang)
export default function App() {
  return (
    <Routes>
      <Route element={<QuanLyLayout />}>
        {MENU_ITEMS.map((m) => (
          <Route key={m.to} path={m.to} />
        ))}
      </Route>
      <Route path={ROUTES.coursePlayer} element={<CoursePlayerPage />} />
      <Route path={ROUTES.videoTheoId} element={<VideoTheoIdPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
