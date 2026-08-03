import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, Loader2, Search, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import Layout from '../components/Layout'
import TieuDeTrang from '../components/TieuDeTrang'
import { useAuth } from '../contexts/AuthContext'
import { getDanhGiaCuaSinhVienList } from '../services/danhGiaService'
import { createCourseToken } from '../services/baiGiangService'
import { buildCoursePlayerPath } from '../constants/routes'
import nofound from '../assets/nofound.svg'
import emptyState from '../assets/Empty_state.svg'

// Các mức số dòng/trang; mặc định 15 dòng cho lần tải đầu.
const PAGE_SIZE_OPTIONS = [15, 50, 100, 200, 300]
const DEFAULT_PAGE_SIZE = 15

// Giá trị mặc định (rỗng) cho form tìm kiếm — cũng dùng để "Xóa lọc".
const EMPTY_FILTERS = {
  courseName: '',
  courseCode: '',
  videoTitle: '',
  starsFrom: '',
  starsTo: '',
  dateFrom: '',
  dateTo: '',
}

// Hình minh họa cho trạng thái rỗng.
// - filtered = true  -> đang lọc mà không khớp   -> nofound.svg
// - filtered = false -> chưa có đánh giá nào      -> Empty_state.svg
function EmptyIllustration({ filtered }) {
  return (
    <img
      src={filtered ? nofound : emptyState}
      alt={filtered ? 'Không tìm thấy kết quả' : 'Chưa có đánh giá'}
      className="mx-auto h-36 w-auto"
    />
  )
}

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

// Sinh dãy số trang hiển thị, chèn '...' khi quá nhiều trang.
// Luôn hiện trang đầu/cuối + cửa sổ quanh trang hiện tại.
function getPageNumbers(current, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages = [1]
  const from = Math.max(2, current - 1)
  const to = Math.min(totalPages - 1, current + 1)
  if (from > 2) pages.push('...')
  for (let p = from; p <= to; p++) pages.push(p)
  if (to < totalPages - 1) pages.push('...')
  pages.push(totalPages)
  return pages
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
    'bg-indigo-800',
    'bg-rose-800',
    'bg-emerald-800',
    'bg-amber-800',
    'bg-sky-800',
    'bg-violet-800',
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

  // Phân trang: giữ bộ lọc đang áp dụng để đổi trang/số dòng mà không mất điều kiện lọc.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS)

  // Trạng thái tìm kiếm: form đang nhập + panel mở/đóng + số bộ lọc đang áp dụng (để hiện chấm báo).
  const [searchOpen, setSearchOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FILTERS)
  const [activeCount, setActiveCount] = useState(0)

  // lectureId đang mở (để hiện spinner trên đúng nút), '' nếu không có.
  const [openingId, setOpeningId] = useState(null)
  const [openError, setOpenError] = useState('')

  // Chặn StrictMode (dev) chạy effect 2 lần -> tránh gọi API lặp cho lần tải đầu.
  const fetchedRef = useRef(false)

  // Gọi API kèm bộ lọc + phân trang; đếm số field có giá trị để hiển thị chấm báo trên nút tìm kiếm.
  const load = useCallback((filters, nextPage = 1, nextPageSize = DEFAULT_PAGE_SIZE) => {
    setLoading(true)
    setError('')
    setActiveCount(Object.values(filters).filter((v) => v !== '' && v != null).length)
    setAppliedFilters(filters)
    setPage(nextPage)
    setPageSize(nextPageSize)

    return getDanhGiaCuaSinhVienList(filters, { page: nextPage, pageSize: nextPageSize })
      .then((data) => {
        // Chuẩn hoá field BE -> field UI; total/average lấy luôn từ /my (BE đã gộp sẵn).
        const mapped = (data?.reviews || []).map((r) => ({
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
        setTotal(data?.total ?? mapped.length)
        setTotalPages(data?.totalPages ?? 1)
        if (data?.page) setPage(data.page) // BE có thể ghim về trang cuối nếu vượt quá
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

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    load(EMPTY_FILTERS, 1, DEFAULT_PAGE_SIZE)
  }, [load])

  // Đổi trang (giữ nguyên bộ lọc + số dòng đang áp dụng).
  const goToPage = (target) => {
    if (target < 1 || target > totalPages || target === page || loading) return
    load(appliedFilters, target, pageSize)
  }

  // Đổi số dòng/trang -> quay về trang 1.
  const onPageSizeChange = (e) => {
    load(appliedFilters, 1, Number(e.target.value))
  }

  // Đóng panel khi nhấn Esc.
  useEffect(() => {
    if (!searchOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen])

  const onFieldChange = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }))

  const onSubmit = (e) => {
    e.preventDefault()
    load(form, 1, pageSize) // tìm mới -> về trang 1, giữ số dòng đang chọn
    setSearchOpen(false) // đóng panel (nhất là trên mobile) sau khi tìm
  }

  const onReset = () => {
    setForm(EMPTY_FILTERS)
    load(EMPTY_FILTERS, 1, pageSize)
  }

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
      <TieuDeTrang
        tieuDe="Đánh giá của tôi"
        moTa="Xem lại toàn bộ đánh giá và bình luận bạn đã gửi cho các bài giảng."
      />

      {/* Neo tìm kiếm: nút cố định mép trái, bấm để mở panel tìm kiếm dọc. */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Mở tìm kiếm"
        className="fixed left-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1 rounded-r-lg bg-[#153898] py-3 pl-2 pr-2.5 text-white shadow-lg transition hover:bg-[#0032ba]"
      >
        <Search size={18} />
        {activeCount > 0 && !loading && (
          <span
            title={`${total} kết quả khớp bộ lọc`}
            className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-indigo-600"
          >
            {total}
          </span>
        )}
      </button>

      {/* Lớp nền mờ khi mở panel (bấm ra ngoài để đóng). */}
      <div
        onClick={() => setSearchOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${searchOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
      />

      {/* Panel tìm kiếm dọc bên trái — trượt vào từ mép trái, co gọn trên mobile. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] transform flex-col bg-white shadow-xl transition-transform duration-300 ${searchOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-900">
            <Search size={18} className="text-gray-600" />
            <h2 className="text-sm font-semibold">Tìm kiếm đánh giá</h2>
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="Đóng"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tên môn học</label>
              <input
                type="text"
                value={form.courseName}
                onChange={onFieldChange('courseName')}
                placeholder="VD: Chủ nghĩa xã hội khoa học"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Mã môn học</label>
              <input
                type="text"
                value={form.courseCode}
                onChange={onFieldChange('courseCode')}
                placeholder="VD: LLCT..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tên bài giảng</label>
              <input
                type="text"
                value={form.videoTitle}
                onChange={onFieldChange('videoTitle')}
                placeholder="VD: Hoàn cảnh ra đời..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Số sao</label>
              <div className="flex items-center gap-2">
                <select
                  value={form.starsFrom}
                  onChange={onFieldChange('starsFrom')}
                  className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Từ</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} sao</option>
                  ))}
                </select>
                <span className="text-gray-400">–</span>
                <select
                  value={form.starsTo}
                  onChange={onFieldChange('starsTo')}
                  className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Đến</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} sao</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Thời gian đánh giá</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-xs text-gray-500">Từ</span>
                  <input
                    type="date"
                    value={form.dateFrom}
                    onChange={onFieldChange('dateFrom')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-xs text-gray-500">Đến</span>
                  <input
                    type="date"
                    value={form.dateTo}
                    onChange={onFieldChange('dateTo')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-gray-200 px-4 py-3">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw size={14} />
              Xóa lọc
            </button>
            <button
              type="submit"
              className="inline-flex flex-1 items-center justify-center gap-1 bg-[#153898] px-3 py-2 text-sm font-medium text-white hover:bg-[#0032ba] "
            >
              <Search size={14} />
              Tìm kiếm
            </button>
          </div>
        </form>
      </aside>

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

                <p className="mt-2 text-sm text-gray-700 text-justify">
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
            <div className="px-4 py-12 text-center">
              <EmptyIllustration filtered={activeCount > 0} />
              <p className="mt-3 text-sm font-medium text-gray-600">
                {activeCount > 0
                  ? 'Không có đánh giá nào phù hợp với tìm kiếm của bạn.'
                  : 'Bạn chưa đánh giá bài giảng nào, hãy bắt đầu với 1 video'}
              </p>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onReset}
                  className="mt-3 inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                >
                  <RotateCcw size={13} />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </div>

        {/* Thanh phân trang: chỉ hiện khi có kết quả. */}
        {!loading && !error && total > 0 && (
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            {/* Bên trái: khoảng đang xem + chọn số dòng/trang */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                {(page - 1) * pageSize + 1}
                {'–'}
                {Math.min(page * pageSize, total)} / {total}
              </span>
              <label className="flex items-center gap-1">
                <span>Số dòng</span>
                <select
                  value={pageSize}
                  onChange={onPageSizeChange}
                  className="rounded-md border border-gray-300 px-2 py-1 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Bên phải: điều hướng trang */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                aria-label="Trang trước"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers(page, totalPages).map((p, i) =>
                p === '...' ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm ${
                      p === page
                        ? 'border-[#153898] bg-[#153898] text-white'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                aria-label="Trang sau"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>
    </Layout>
  )
}
