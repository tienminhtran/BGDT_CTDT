import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { authService, sinhVienHocPhanService } from '../services'
import { STORAGE_KEYS } from '../constants'

/**
 * Quản lý trạng thái đăng nhập LMS cho toàn ứng dụng.
 * - Khi mở app: nếu có token đã lưu -> gọi /auth/me kiểm tra còn sống.
 * - login/logout cập nhật cả localStorage lẫn state.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token)
    if (!token) {
      setChecking(false)
      return
    }
    authService
      .getCurrentUser()
      .then(setUser)
      .catch(() => localStorage.removeItem(STORAGE_KEYS.token))
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const { token, user: loggedInUser } = await authService.login(
      username,
      password
    )
    localStorage.setItem(STORAGE_KEYS.token, token)
    setUser(loggedInUser)

    // Lưu lần đầu các học phần hiện có vào DB (không chặn UI).
    sinhVienHocPhanService.importHocPhan().catch(() => {})
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook tiện dụng để lấy context đăng nhập ở bất kỳ component nào.
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth phải được dùng bên trong <AuthProvider>')
  }
  return ctx
}
