import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../constants'

// Bọc các trang yêu cầu đăng nhập: chưa đăng nhập -> chuyển về trang chủ.
export default function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to={ROUTES.home} replace />
  return children
}
