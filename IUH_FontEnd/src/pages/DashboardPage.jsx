import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import Layout from '../components/Layout'
import CourseList from '../components/CourseList'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../constants'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <Layout user={user} onLogout={logout}>
      <main className="w-full px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Xin chào, {user.fullname}</h1>
            {user.username && (
              <p className="text-sm text-gray-500">MSSV: {user.username}</p>
            )}
          </div>
          <Link
            to={ROUTES.quanLyBaiGiang}
            className="flex items-center gap-1.5 rounded-md bg-[#115EA8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d4a82]"
          >
            <BookOpen size={16} /> Quản lý bài giảng
          </Link>
        </div>

        <CourseList />
      </main>
    </Layout>
  )
}
