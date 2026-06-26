import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import bgImage from '../assets/bg.jpg'
import logo from '../assets/logo.svg'
import img_bg_login from '../assets/img_bg_login.svg'

/* ---------- Số đếm động khi cuộn tới ---------- */
function CountUp({ end, suffix = '', duration = 1500 }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true
            const t0 = performance.now()
            const tick = (t) => {
              const p = Math.min((t - t0) / duration, 1)
              setVal(Math.floor(p * end))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [end, duration])

  return (
    <span ref={ref}>
      {val.toLocaleString('vi-VN')}
      {suffix}
    </span>
  )
}

/* ---------- Dữ liệu Khoa/Viện ---------- */
const FACULTIES = [
  {
    icon: '💻',
    name: 'Công nghệ Thông tin',
    subjects: ['Công nghệ phần mềm', 'Lập trình Java', 'Cơ sở dữ liệu', 'Trí tuệ nhân tạo'],
  },
  {
    icon: '⚡',
    name: 'Điện - Điện tử',
    subjects: ['Mạch điện tử', 'Vi xử lý', 'Hệ thống nhúng', 'Điều khiển tự động'],
  },
  {
    icon: '⚙️',
    name: 'Cơ khí',
    subjects: ['Sức bền vật liệu', 'CAD/CAM', 'Kỹ thuật chế tạo máy', 'Cơ học kỹ thuật'],
  },
  {
    icon: '📊',
    name: 'Quản trị Kinh doanh',
    subjects: ['Quản trị học', 'Marketing căn bản', 'Quản trị tài chính', 'Khởi nghiệp'],
  },
  {
    icon: '🌐',
    name: 'Ngoại ngữ',
    subjects: ['Tiếng Anh giao tiếp', 'Biên - Phiên dịch', 'Anh văn chuyên ngành', 'TOEIC'],
  },
  {
    icon: '🧪',
    name: 'Công nghệ Hóa học',
    subjects: ['Hóa đại cương', 'Hóa hữu cơ', 'Kỹ thuật phản ứng', 'Hóa phân tích'],
  },
]

const FAQS = [
  {
    q: 'Quên mật khẩu tài khoản trường thì làm sao?',
    a: 'Liên hệ Phòng Đào tạo hoặc Trung tâm CNTT để được cấp lại mật khẩu tài khoản định danh của trường.',
  },
  {
    q: 'Lỗi không vào được bài giảng video?',
    a: 'Kiểm tra kết nối mạng, thử trình duyệt Chrome bản mới nhất, xóa cache. Nếu vẫn lỗi, liên hệ hotline kỹ thuật bên dưới.',
  },
  {
    q: 'Tôi là tân sinh viên, dùng tài khoản nào để đăng nhập?',
    a: 'Dùng đúng tài khoản (MSSV + mật khẩu) do nhà trường cấp khi nhập học.',
  },
]

export default function HomePage() {
  const { login } = useAuth()

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  const heroBg = {
    backgroundImage: `url(${bgImage})`,
    backgroundColor: '#1e3a8a',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  return (
    <div className="w-full text-slate-800">
      {/* ===== 1. HERO & ĐĂNG NHẬP ===== */}
      <section className="relative flex min-h-screen w-full items-center overflow-hidden">
        {/* Lớp ảnh nền mờ (chỉ blur ảnh, không blur nội dung) */}
        <div
          className="absolute inset-0 scale-110 bg-cover bg-center bg-no-repeat blur-sm"
          style={heroBg}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-black/30"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-6 py-16 lg:flex-row lg:justify-between lg:gap-8">
          {/* Hướng dẫn sử dụng - hiện sau Login trên mobile, hiện trước (trái) trên desktop */}
          <div className="order-2 w-full max-w-md rounded-xl border border-white/30 bg-[#8CB8C4]/80 p-7 shadow-xl backdrop-blur-md lg:order-1">          <h1 className="text-center text-2xl font-bold text-white drop-shadow sm:text-3xl">
               Hệ thống Bài giảng điện tử
            </h1>
            <p className="mt-1 text-center text-lg font-bold text-blue-900 drop-shadow sm:text-xl">
              Đại học Công nghiệp TP.HCM
            </p>

            <ol className="mt-6 space-y-4 text-[15px] leading-relaxed text-black/90">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>
                  Sinh viên, giảng viên đăng nhập bằng tài khoản{' '}
                  <span className="font-medium text-blue-200">LMS</span> do nhà
                  trường cấp. Không sử dụng tài khoản của hệ thống khác để đăng
                  nhập.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>
                  Nếu quên mật khẩu hoặc không đăng nhập được, vui lòng liên hệ
                  Trung tâm Quản trị Hệ thống E.2 để được hỗ trợ về vấn đề tài
                  khoản LMS.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>
                  Sau khi đăng nhập, sinh viên có thể xem bài giảng, tài liệu
                  học tập theo từng môn học, khoa/viện đã đăng ký trong học kỳ.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>
                  Nếu gặp lỗi kỹ thuật trong quá trình sử dụng (không tải được
                  video, lỗi trang...), vui lòng liên hệ Phòng Đào tạo để được hỗ trợ.
                </span>
              </li>
            </ol>
          </div>

          {/* Form đăng nhập - hiện trước trên mobile, hiện sau (phải) trên desktop */}
          <div className="order-1 w-full max-w-md lg:order-2">
            <LoginForm login={login} />
          </div>
        </div>
      </section>
    </div>
  )
}

/* ---------- Form đăng nhập hiển thị trực tiếp ---------- */
function LoginForm({ login }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(username, password)
    } catch (err) {
      setError(err?.response?.data?.message || 'Sai tài khoản hoặc mật khẩu')
    } finally {
      setLoading(false)
      setPassword('')
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">

      {/* Banner */}
      <div className="relative h-44 bg-gradient-to-r from-blue-500 to-blue-400">
        <img
          src={img_bg_login}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />

        <div className="relative z-10 flex h-full flex-col items-center justify-center">
          <img
            src={logo}
            alt="IUH"
            className="w-52 object-contain"
          />

          <h2 className="mt-4 text-2xl font-bold text-white">
            Đăng nhập hệ thống
          </h2>

          <p className="mt-1 text-sm text-blue-100">
          
            Sử dụng tài khoản{' '}
            <a
              href="https://lms.iuh.edu.vn"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 hover:underline"
            >
              LMS của Trường
            </a>
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="relative p-8">

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mã số sinh viên
            </label>

            <input
              type="text"
              placeholder="Nhập MSSV"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-sm border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mật khẩu
            </label>

            <input
              type="password"
              placeholder="Nhập mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          {error && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-sm bg-blue-700 py-3 text-lg font-semibold text-white transition hover:bg-blue-800 disabled:bg-blue-300"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-2 border-t pt-5 text-center text-sm text-slate-500">
          <p className="text-xs text-slate-400">
            © 2026 Phòng Đào tạo - Đại học Công nghiệp TP.HCM
          </p>
        </div>

        {/* Hoa văn góc dưới */}
        <img
          src={img_bg_login}
          alt=""
          className="pointer-events-none absolute bottom-0 right-0 w-52 opacity-10"
        />
      </div>
    </div>
  )
}

/* ---------- Thẻ Khoa/Viện (mở rộng xem môn) ---------- */
function FacultyCard({ faculty, onLogin }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-3">
          <span className="text-3xl">{faculty.icon}</span>
          <span className="font-semibold text-slate-800">{faculty.name}</span>
        </span>
        <span className="text-slate-400">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
          {faculty.subjects.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={onLogin}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-blue-900"
                title="Đăng nhập để vào học"
              >
                <span>{s}</span>
                <span className="text-xs text-slate-400">🔒 Đăng nhập</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}