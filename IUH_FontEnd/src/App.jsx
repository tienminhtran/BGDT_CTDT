import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useMoodleAuth } from './hooks/useMoodleAuth'
import Home from './components/Home'
import Dashboard from './components/Dashboard'
import CoursePlayer from './components/CoursePlayer'
import QuanLyBaiGiang from './components/QuanLyBaiGiang'

export default function App() {
  const { user, checking, login, logout } = useMoodleAuth()

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
        path="/"
        element={
          user ? <Navigate to="/trang-chu" replace /> : <Home login={login} />
        }
      />

      {/* Trang chính sau đăng nhập (URL riêng) */}
      <Route
        path="/trang-chu"
        element={
          user ? (
            <Dashboard user={user} onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Trang quản lý bài giảng (chọn môn/phiên bản, upload video) */}
      <Route
        path="/quan-ly-bai-giang"
        element={
          user ? (
            <QuanLyBaiGiang user={user} onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Trang xem bài giảng của một môn: /bai-giang-dien-tu/<mã môn>/<phiên bản> */}
      <Route
        path="/bai-giang-dien-tu/:maMon/:version"
        element={
          user ? (
            <CoursePlayer user={user} onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      {/* Không có phiên bản -> mặc định */}
      <Route
        path="/bai-giang-dien-tu/:maMon"
        element={
          user ? (
            <CoursePlayer user={user} onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      {/* Mọi đường dẫn khác -> về trang phù hợp */}
      <Route
        path="*"
        element={<Navigate to={user ? '/trang-chu' : '/'} replace />}
      />
    </Routes>
  )
}
