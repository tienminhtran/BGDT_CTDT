import { Link } from 'react-router-dom'
import { BookOpen } from 'lucide-react'
import Layout from './Layout'
import CourseList from './CourseList'

export default function Dashboard({ user, onLogout }) {
  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Xin chào, {user.fullname}</h1>
            {user.username && (
              <p className="text-sm text-gray-500">MSSV: {user.username}</p>
            )}
          </div>
          <Link
            to="/quan-ly-bai-giang"
            className="flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <BookOpen size={16} /> Quản lý bài giảng
          </Link>
        </div>

        <CourseList />
      </main>
    </Layout>
  )
}
