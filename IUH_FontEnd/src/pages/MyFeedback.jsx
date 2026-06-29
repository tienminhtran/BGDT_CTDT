import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Loader2 } from 'lucide-react'
import Layout from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { getDanhGiaCuaSinhVienList } from '../services/danhGiaService'
import { createCourseToken } from '../services/baiGiangService'
import { buildCoursePlayerPath } from '../constants/routes'

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
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // lectureId đang mở (để hiện spinner trên đúng nút), '' nếu không có.
  const [openingId, setOpeningId] = useState(null)
  const [openError, setOpenError] = useState('')

  // Chặn StrictMode (dev) chạy effect 2 lần -> tránh gọi API lặp.
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    setLoading(true)
    setError('')

    getDanhGiaCuaSinhVienList()
      .then((reviews) => {
        // Chuẩn hoá field BE -> field UI; total/average lấy luôn từ /my (BE đã gộp sẵn).
        const mapped = (reviews || []).map((r) => ({
          lectureId: r.lectureId,
          courseCode: r.courseCode || String(r.lectureId ?? ''),
          rawCourseCode: r.courseCode || null, // ma_tuquan thật để tạo token (null nếu thiếu liên kết)
          courseName: r.courseName || 'Bài giảng',
          version: r.version || null,
          videoTitle: r.videoTitle || '',
          rating: r.stars,
          comment: r.comment,
          createdAt: r.createdAt,
          total: r.total ?? 0,
          average: r.average ?? 0,
        }))
        setItems(mapped)
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message || 'Không tải được danh sách đánh giá. Vui lòng thử lại.'
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // BE đã sort mới nhất trước; giữ sort phòng hờ.
  const sortedFeedback = [...items].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )

  // Mở trang xem đúng bài giảng: tạo token mờ (courseCode + version) rồi điều hướng kèm ?bg=<lectureId>.
  const xemBaiGiang = async (item) => {
    if (!item.rawCourseCode || !item.version) {
      setOpenError('Bài giảng này thiếu thông tin môn/phiên bản, không mở được.')
      return
    }
    setOpenError('')
    setOpeningId(item.lectureId)
    try {
      const token = await createCourseToken(item.rawCourseCode, item.version)
      navigate(`${buildCoursePlayerPath(token)}?bg=${item.lectureId}`)
    } catch (err) {
      setOpenError(err?.response?.data?.message || 'Không mở được bài giảng. Vui lòng thử lại.')
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <Layout user={user} onLogout={logout}>
      <main className="mx-auto w-full max-w-3xl px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold">Đánh giá của bạn</h1>
          <p className="mt-1 text-sm text-gray-500">
            Danh sách bình luận và đánh giá bạn đã gửi cho các bài giảng.
          </p>
          {openError && (
            <p className="mt-2 text-sm text-rose-600">{openError}</p>
          )}
        </div>

        <div className="mt-5 divide-y divide-gray-100 border border-gray-200 bg-white shadow-sm">
          {loading && (
            <div className="px-4 py-10 text-center text-gray-500">Đang tải...</div>
          )}

          {!loading && error && (
            <div className="px-4 py-10 text-center text-rose-600">{error}</div>
          )}

          {!loading && !error && sortedFeedback.map((item, idx) => (
            <article key={`${item.courseCode}-${idx}`} className="flex gap-3 px-5 py-4">
              <CourseAvatar courseName={item.courseName} courseCode={item.courseCode} />

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium text-gray-900 cursor-pointer hover:underline"
                      onClick={() => xemBaiGiang(item)}
                    >
                      {item.courseName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {item.videoTitle}
                    </p>
                  </div>

                  {/* Vị trí số like trong UI mẫu được thay bằng số sao đánh giá của chính SV */}
                  <div className="flex shrink-0 flex-col items-end gap-0.5 pt-0.5">
                    <StarRating value={item.rating} />
                    {item.average != null && (
                      <span className="text-[11px] text-gray-400">
                         {Number(item.average).toFixed(1)} · {item.total} lượt
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                 Thời gian đánh giá: {formatRelativeTime(item.createdAt)}
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
                  onClick={() => xemBaiGiang(item)}
                  disabled={openingId === item.lectureId}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400 cursor-pointer underline-offset-2 hover:text-gray-600 hover:underline disabled:opacity-60"
                >
                  {openingId === item.lectureId && (
                    <Loader2 size={12} className="animate-spin" />
                  )}
                  Xem bài giảng
                </button>
              </div>
            </article>
          ))}

          {!loading && !error && sortedFeedback.length === 0 && (
            <div className="px-4 py-10 text-center text-gray-500">
              Bạn chưa đánh giá bài giảng nào.
            </div>
          )}
        </div>
      </main>
    </Layout>
  )
}