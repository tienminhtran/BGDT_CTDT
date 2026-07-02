import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, ExternalLink, BookOpen, FileVideoCamera } from 'lucide-react'
import { courseService, baiGiangService } from '../services'
import { STORAGE_KEYS, buildLmsCourseUrl } from '../constants'

function ProgressBar({ value }) {
  const pct = Math.round(value ?? 0)
  return (
    <div className="mt-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-[#115EA8] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mt-1 block text-xs text-slate-500">Tiến độ {pct}%</span>
    </div>
  )
}

export default function CourseList() {
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, courses: [], error: '' })
  const [path, setPath] = useState('')

  // Nhập "mã môn/phiên bản" (vd 2101420/1) hoặc dán cả URL (đã mã hóa) -> Enter để vào học.
  // Quyền truy cập được kiểm tra ở trang bài giảng (theo mã môn).
  const goToLesson = async (e) => {
    e.preventDefault()
    const v = path.trim()
    if (!v) return

    // Nếu dán nguyên URL: phần sau 'bai-giang-dien-tu/' đã là token mờ -> đi thẳng
    const marker = 'bai-giang-dien-tu/'
    const idx = v.indexOf(marker)
    if (idx !== -1) {
      const token = v.slice(idx + marker.length).replace(/^\/+/, '').replace(/\/+$/, '')
      if (token) navigate(`/bai-giang-dien-tu/${token}`)
      return
    }

    // Gõ tay "mã môn/phiên bản" -> xin token mờ từ backend rồi điều hướng
    const [courseCode, version] = v.replace(/^\/+/, '').replace(/\/+$/, '').split('/')
    if (!courseCode) return
    try {
      const token = await baiGiangService.createCourseToken(courseCode, version || null)
      navigate(`/bai-giang-dien-tu/${token}`)
    } catch {
      // Lỗi mạng/token -> bỏ qua, người dùng thử lại
    }
  }

  useEffect(() => {
    // Không có wstoken (vào bằng phiên LMS qua extension) -> không gọi được API này
    if (!localStorage.getItem(STORAGE_KEYS.token)) {
      setState({ loading: false, courses: [], error: 'no-token' })
      return
    }
    courseService
      .getMyCourses()
      .then((courses) => setState({ loading: false, courses, error: '' }))
      .catch((err) =>
        setState({
          loading: false,
          courses: [],
          error: err?.response?.data?.message || 'Không tải được danh sách môn học',
        })
      )
  }, [])

  if (state.loading) {
    return <p className="mt-8 text-slate-500">Đang tải môn học...</p>
  }

  if (state.error === 'no-token') {
    return (
      <p className="mt-8 rounded-lg bg-amber-50 p-4 text-sm text-amber-700">
        Đăng nhập bằng tài khoản LMS (nút Đăng nhập) để xem danh sách môn học của bạn.
      </p>
    )
  }

  if (state.error) {
    return <p className="mt-8 text-red-600">{state.error}</p>
  }

  if (!state.courses.length) {
    return <p className="mt-8 text-slate-500">Bạn chưa tham gia môn học nào.</p>
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-xl font-bold text-[#115EA8]">
        Môn học của bạn ({state.courses.length})
      </h2>

      {/* Ô nhập đường dẫn vào học: gõ "mã môn/phiên bản" (vd 2101420/1) rồi Enter */}
      {/* <p className="mb-3 text-sm text-slate-500">
        Nhập <span className="font-medium">mã Giảng viên cung cấp tại LMS của khóa học đó</span>
        2101420/1
      </p>
      <form onSubmit={goToLesson} className="mb-6 flex gap-2">
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="Nhập đường dẫn hoặc mã bài giảng"
          className="flex-1 rounded-sm border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#115EA8]"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-1.5 rounded-sm bg-[#153898] px-4 py-2 text-sm cursor-pointer font-semibold text-white transition hover:bg-[#0d4a82]"
        >
           <svg
            id="Layer_1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            width="14px"
            height="14px"
            viewBox="0 0 60 60"
            enableBackground="new 0 0 60 60"
            xmlSpace="preserve"
          >
            <g id="XMLID_1_">
              <g>
                <polygon
                  fill="#ffffff"
                  points="34.305,22.889 25.708,27.876 25.708,17.902"
                />
                <rect
                  x={1.693}
                  y={44.797}
                  fill="#ffffff"
                  width={56.615}
                  height={13.921}
                />
                <text
                  x={30}
                  y={54}
                  textAnchor="middle"
                  fill="#0800e5"
                  fontSize={10}
                  fontFamily="Arial"
                  fontWeight="bold"
                >
                  {"\n        BGDT PDT\n    "}
                </text>
              </g>
              <g>
                <polygon
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit={10}
                  points=" 58.307,44.797 58.307,58.719 1.693,58.719 1.693,44.797 1.693,1.833 58.307,1.833  "
                />
                <line
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit={10}
                  x1={1.693}
                  y1={44.797}
                  x2={58.307}
                  y2={44.797}
                />
                <polygon
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeMiterlimit={10}
                  points=" 34.305,22.889 25.708,27.876 25.708,17.902  "
                />
              </g>
            </g>
          </svg>
          Bài giảng
        </button>
      </form> */}

      <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {state.courses.map((c) => (
          <div
            key={c.id}
            className="flex h-full flex-col border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#153898] hover:shadow-md"
          >
            <h3 className="line-clamp-2 min-h-[3rem] font-semibold text-slate-800">
              {c.fullname}
            </h3>
            <p className="mt-1 text-xs text-slate-400">{c.idnumber}</p>
            <ProgressBar value={c.progress} />

            {/* Hàng nút: Xem bài giảng + Truy cập LMS (cùng một hàng) */}
            <div className="mt-auto flex gap-2 pt-4">
              <button
                type="button"
                disabled={!c.token}
                title={c.token ? 'Xem danh sách video bài giảng' : 'Môn này chưa có bài giảng'}
                onClick={() => c.token && navigate(`/bai-giang-dien-tu/${c.token}`)}
                className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-[#115EA8] hover:text-[#115EA8] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-600"
              >
                <FileVideoCamera size={16} />
                Bài giảng
              </button>
              <a
                href={buildLmsCourseUrl(c.id)}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-sm border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-[#115EA8] hover:text-[#115EA8]"
              >
                <ExternalLink size={16} />
                LMS
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
