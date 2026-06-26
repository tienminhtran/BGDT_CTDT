import { ThumbsUp, Star } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'

/**
 * MOCK DATA
 * Mỗi item = 1 video bài giảng đã được sinh viên đánh giá, gắn với 1 môn học.
 * Khi có API thật, chỉ cần thay mảng này bằng kết quả fetch, giữ nguyên field.
 * Thêm `createdAt` để hiển thị thời gian như UI "Ý kiến".
 */
const FEEDBACK_DATA = [
  {
    courseCode: '4203001111104',
    courseName: 'Công nghệ phần mềm',
    videoTitle: 'Bài 1: Tổng quan về quy trình phát triển phần mềm',
    rating: 5,
    comment: 'Bài giảng rất dễ hiểu, ví dụ thực tế cụ thể.',
    createdAt: '2026-06-26T08:10:00',
  },
  {
    courseCode: '4203001111104',
    courseName: 'Công nghệ phần mềm',
    videoTitle: 'Bài 2: Mô hình Waterfall và Agile',
    rating: 4,
    comment: 'Nội dung tốt nhưng âm thanh đôi lúc nhỏ.',
    createdAt: '2026-06-25T19:59:00',
  },
  {
    courseCode: '4203001111104',
    courseName: 'Công nghệ phần mềm',
    videoTitle: 'Bài 3: UML và biểu đồ Use Case',
    rating: 5,
    comment: '',
    createdAt: '2026-06-25T16:55:00',
  },
  {
    courseCode: '2101420',
    courseName: 'Lập trình hướng đối tượng',
    videoTitle: 'Bài 1: Lớp và đối tượng trong Java',
    rating: 5,
    comment: 'Giảng viên giải thích rất kỹ.',
    createdAt: '2026-06-25T08:33:00',
  },
  {
    courseCode: '2101420',
    courseName: 'Lập trình hướng đối tượng',
    videoTitle: 'Bài 2: Tính kế thừa (Inheritance)',
    rating: 4,
    comment: '',
    createdAt: '2026-06-24T21:05:00',
  },
  {
    courseCode: '4203001111305',
    courseName: 'Mạng máy tính',
    videoTitle: 'Bài 1: Mô hình OSI 7 tầng',
    rating: 4,
    comment: 'Nội dung đầy đủ, dễ áp dụng vào thực tế.',
    createdAt: '2026-06-24T14:20:00',
  },
]

// Format thời gian kiểu "1h trước" cho mốc gần, "HH:mm dd/MM" cho mốc xa hơn — giống UI mẫu
function formatRelativeTime(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins}p trước`
  if (diffHours < 24) return `${diffHours}h trước`

  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  return `${hh}:${mm} ${dd}/${mo}`
}

function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
        />
      ))}
    </div>
  )
}

// Avatar tròn lấy chữ cái đầu của tên môn học, màu nền cố định theo mã môn để các avatar nhất quán
function CourseAvatar({ courseName, courseCode }) {
  const colors = [
    'bg-indigo-500',
    'bg-rose-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-violet-500',
  ]
  const colorIndex =
    Math.abs(
      courseCode.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    ) % colors.length

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${colors[colorIndex]}`}
    >
      {courseName.trim().charAt(0).toUpperCase()}
    </div>
  )
}

export default function MyFeedback() {
  const { user, logout } = useAuth()

  // Sắp xếp theo thời gian mới nhất trước, giống feed "Ý kiến"
  const sortedFeedback = [...FEEDBACK_DATA].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  return (
    <Layout user={user} onLogout={logout}>
      <main className="mx-auto w-full max-w-3xl px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold">Đánh giá của bạn</h1>
          <p className="mt-1 text-sm text-gray-500">
            Danh sách bình luận và đánh giá bạn đã gửi cho các bài giảng.
          </p>
        </div>

        <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
          {sortedFeedback.map((item, idx) => (
            <article key={`${item.courseCode}-${idx}`} className="flex gap-3 px-5 py-4">
              <CourseAvatar courseName={item.courseName} courseCode={item.courseCode} />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {item.courseName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {item.videoTitle}
                    </p>
                  </div>

                  {/* Vị trí số like trong UI mẫu được thay bằng số sao đánh giá */}
                  <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                    <StarRating value={item.rating} />
                  </div>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  {formatRelativeTime(item.createdAt)}
                </p>

                <p className="mt-2 text-sm text-gray-700">
                  {item.comment ? (
                    item.comment
                  ) : (
                    <span className="text-gray-400">Không có bình luận</span>
                  )}
                </p>

                <button
                  type="button"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline"
                >
                  Xem bài giảng
                </button>
              </div>
            </article>
          ))}

          {sortedFeedback.length === 0 && (
            <div className="px-4 py-10 text-center text-gray-500">
              Bạn chưa đánh giá bài giảng nào.
            </div>
          )}
        </div>
      </main>
    </Layout>
  )
}