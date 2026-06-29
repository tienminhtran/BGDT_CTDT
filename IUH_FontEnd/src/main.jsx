import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext'

// Không dùng StrictMode để tránh effect chạy 2 lần ở dev (gây gọi API lặp như /me, /courses,
// /access, /lectures...). Đây là hành vi dev-only; bỏ đi để Network tab phản ánh đúng số lần gọi.
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
