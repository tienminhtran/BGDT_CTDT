import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from './constants'
import { QuanLyBaiGiangPage, CoursePlayerPage } from './pages'

// App giảng viên: KHÔNG đăng nhập. Chỉ 2 trang:
//  - Quản lý bài giảng (chọn môn/phiên bản, upload video)  -> trang chủ "/"
//  - Xem bài giảng theo token mờ                            -> "/bai-giang-dien-tu/:token"
export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<QuanLyBaiGiangPage />} />
      <Route path={ROUTES.coursePlayer} element={<CoursePlayerPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
