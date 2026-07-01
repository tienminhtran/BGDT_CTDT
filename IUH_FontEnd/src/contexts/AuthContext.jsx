import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react'
import { authService, sinhVienHocPhanService } from '../services'
import { STORAGE_KEYS, SESSION_MAX_AGE_MS } from '../constants'

/**
 * Quản lý trạng thái đăng nhập LMS cho toàn ứng dụng.
 * - Khi mở app: nếu có token đã lưu và phiên CHƯA quá 2h -> gọi /auth/me kiểm tra còn sống.
 * - Phiên sống tối đa SESSION_MAX_AGE_MS (2h) tính từ lúc login; quá hạn -> tự đăng xuất.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const logoutTimer = useRef(null)

  const clearLogoutTimer = () => {
    if (logoutTimer.current) {
      clearTimeout(logoutTimer.current)
      logoutTimer.current = null
    }
  }

  const logout = useCallback(() => {
    clearLogoutTimer()
    authService.logout() // xóa cookie phiên sid phía server (fire-and-forget)
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.loginAt)
    setUser(null)
  }, [])

  // Hẹn giờ tự đăng xuất đúng thời điểm phiên hết hạn (loginAt + 2h).
  const scheduleAutoLogout = useCallback(
    (loginAt) => {
      clearLogoutTimer()
      const remaining = loginAt + SESSION_MAX_AGE_MS - Date.now()
      if (remaining <= 0) {
        logout()
        return
      }
      logoutTimer.current = setTimeout(logout, remaining)
    },
    [logout]
  )

  // Khôi phục phiên khi mở lại trang.
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.token)
    const loginAt = Number(localStorage.getItem(STORAGE_KEYS.loginAt))
    if (!token) {
      setChecking(false)
      return
    }

    // Hết hạn phiên (>= 2h) -> dọn token, bắt đăng nhập lại.
    if (!loginAt || Date.now() - loginAt >= SESSION_MAX_AGE_MS) {
      logout()
      setChecking(false)
      return
    }

    authService
      .getCurrentUser()
      .then((u) => {
        setUser(u)
        scheduleAutoLogout(loginAt) // hẹn giờ cho phần thời gian còn lại
      })
      .catch(() => logout())
      .finally(() => setChecking(false))

    return clearLogoutTimer
  }, [logout, scheduleAutoLogout])

  const login = useCallback(
    async (username, password) => {
      const { token, user: loggedInUser } = await authService.login(
        username,
        password
      )
      const loginAt = Date.now()
      localStorage.setItem(STORAGE_KEYS.token, token)
      localStorage.setItem(STORAGE_KEYS.loginAt, String(loginAt))
      setUser(loggedInUser)
      scheduleAutoLogout(loginAt) // bắt đầu đếm 2h

      // Lưu lần đầu các học phần hiện có vào DB (không chặn UI).
      sinhVienHocPhanService.importHocPhan().catch(() => {})
    },
    [scheduleAutoLogout]
  )

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
