import { Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useAuthStore } from '../store/authStore'

/**
 * Chặn route khi chưa đăng nhập: đá về /login và nhớ trang đang muốn vào
 * (state.from) để đăng nhập xong quay lại đúng chỗ.
 *
 * Trang xem 1 video theo id (`/video/:id`) KHÔNG bọc bởi component này — link
 * video gửi ra ngoài vẫn mở được mà không cần đăng nhập.
 */
export default function RequireAuth({ children }) {
  const daDangNhap = useAuthStore((s) => s.daDangNhap)
  const location = useLocation()

  if (!daDangNhap) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }
  return children
}
