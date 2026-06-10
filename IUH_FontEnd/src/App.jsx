import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import { ROUTES } from './constants'
import {
  HomePage,
  DashboardPage,
  QuanLyBaiGiangPage,
  CoursePlayerPage,
} from './pages'

export default function App() {
  const { user, checking } = useAuth()

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={18} />
        Đang tải...
      </div>
    )
  }

  return (
    <Routes>
      {/* Trang đăng nhập */}
      <Route
        path={ROUTES.home}
        element={user ? <Navigate to={ROUTES.dashboard} replace /> : <HomePage />}
      />

      {/* Trang chính sau đăng nhập */}
      <Route
        path={ROUTES.dashboard}
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Trang quản lý bài giảng (chọn môn/phiên bản, upload video) */}
      <Route
        path={ROUTES.quanLyBaiGiang}
        element={
          <ProtectedRoute>
            <QuanLyBaiGiangPage />
          </ProtectedRoute>
        }
      />

      {/* Trang xem bài giảng: /bai-giang-dien-tu/<token mã hóa mã môn/phiên bản> */}
      <Route
        path={ROUTES.coursePlayer}
        element={
          <ProtectedRoute>
            <CoursePlayerPage />
          </ProtectedRoute>
        }
      />

      {/* Mọi đường dẫn khác -> về trang phù hợp */}
      <Route
        path="*"
        element={<Navigate to={user ? ROUTES.dashboard : ROUTES.home} replace />}
      />
    </Routes>
  )
}
