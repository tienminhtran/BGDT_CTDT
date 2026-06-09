import { useState, useEffect, useCallback } from 'react';
import http from '../api/http';

/**
 * Quản lý đăng nhập LMS bằng tài khoản + mật khẩu (token.php).
 * - Khi vào trang: nếu có wstoken đã lưu -> /auth/me kiểm tra còn sống -> hiện info.
 * - Modal đăng nhập mở bằng nút "Đăng nhập" (openLogin).
 */
export const useMoodleAuth = () => {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('moodle_token');
    if (!token) {
      setChecking(false);
      return;
    }
    http
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('moodle_token'))
      .finally(() => setChecking(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await http.post('/auth/login', { username, password });
    localStorage.setItem('moodle_token', res.data.token);
    setUser(res.data.user);
    setShowLogin(false);

    // Lưu lần đầu các học phần hiện có vào DB (idempotent, không chặn UI)
    http.post('/sinhvien-hocphan/import').catch(() => {});
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('moodle_token');
    setUser(null);
  }, []);

  const openLogin = useCallback(() => setShowLogin(true), []);
  const closeLogin = useCallback(() => setShowLogin(false), []);

  return { user, showLogin, checking, login, logout, openLogin, closeLogin };
};
