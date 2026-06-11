import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from './constants'
import { QuanLyBaiGiangPage, CoursePlayerPage, VideoTheoIdPage } from './pages'

// App giảng viên: KHÔNG đăng nhập. Các trang:
//  - Quản lý bài giảng (chọn môn/phiên bản, upload video)  -> "/"
//  - Xem bài giảng theo token mờ                            -> "/bai-giang-dien-tu/:token"
//  - Xem 1 video riêng lẻ theo id (tb_BaiGiang)             -> "/video/:id"
export default function App() {
  return (
    <Routes>
      <Route path={ROUTES.home} element={<QuanLyBaiGiangPage />} />
      <Route path={ROUTES.coursePlayer} element={<CoursePlayerPage />} />
      <Route path={ROUTES.videoTheoId} element={<VideoTheoIdPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
