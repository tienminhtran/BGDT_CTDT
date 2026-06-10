import Layout from '../components/Layout'
import CourseList from '../components/CourseList'
import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <Layout user={user} onLogout={logout}>
      <main className="w-full px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold">Xin chào, {user.fullname}</h1>
          {user.username && (
            <p className="text-sm text-gray-500">MSSV: {user.username}</p>
          )}
        </div>

        <CourseList />
      </main>
    </Layout>
  )
}
