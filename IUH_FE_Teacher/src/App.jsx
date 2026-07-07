import { Routes, Route, Navigate } from 'react-router-dom'
import { ROUTES } from './constants'
import QuanLyLayout from './components/QuanLyLayout'
import {
  QuanLyBaiGiangPage,
  ImportPage,
  DanhGiaPage,
  CoursePlayerPage,
  VideoTheoIdPage,
} from './pages'

// App giảng viên: KHÔNG đăng nhập.
//  - Nhóm 3 trang quản lý dùng chung QuanLyLayout (menu bên trái điều khiển bằng router):
//      "/"              -> Quản lý bài giảng (chọn môn/phiên bản, upload video)
//      "/import-hoc-phan" -> Import học phần ↔ môn học (Excel)
//      "/danh-gia"      -> Quản lý đánh giá (sao, bình luận, lượt xem)
//  - Trang xem video đứng riêng, không có menu:
//      "/bai-giang-dien-tu/:token" -> Xem theo token mờ
//      "/video/:id"                -> Xem 1 video riêng lẻ (tb_BaiGiang)
export default function App() {
  return (
    <Routes>
      <Route element={<QuanLyLayout />}>
        <Route path={ROUTES.home} element={<QuanLyBaiGiangPage />} />
        <Route path={ROUTES.importHocPhan} element={<ImportPage />} />
        <Route path={ROUTES.danhGia} element={<DanhGiaPage />} />
      </Route>
      <Route path={ROUTES.coursePlayer} element={<CoursePlayerPage />} />
      <Route path={ROUTES.videoTheoId} element={<VideoTheoIdPage />} />
      <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
    </Routes>
  )
}
