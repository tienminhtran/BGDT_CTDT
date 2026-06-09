import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import bgImage from '../assets/bg.jpg'
import logo from '../assets/logo.svg'

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
          className="absolute inset-0 scale-110 blur-md"
          style={heroBg}
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          {/* Giới thiệu */}
          <div className="text-center lg:text-left" style={{ color: '#153898' }}>
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              HỆ THỐNG BÀI GIẢNG ĐIỆN TỬ IUH
            </h1>
            <p className="mt-5 text-lg">
              Kho học liệu số chính thức của Trường Đại học Công nghiệp TP.HCM —
              học mọi lúc, mọi nơi.
            </p>
          </div>

          {/* Form đăng nhập (hiển thị trực tiếp) */}
          <LoginForm login={login} />
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
      setPassword('') // không giữ mật khẩu trong state sau khi submit
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-sm bg-white p-8 shadow-2xl">
      <img
        src={logo}
        alt="IUH"
        className="mx-auto w-40 object-contain"
      />
      <h2 className="mt-4 text-center text-xl font-bold text-blue-900">
        Đăng nhập hệ thống
      </h2>
      <p className="mt-1 text-center text-sm text-slate-500">
        Sử dụng tài khoản do nhà trường cấp
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <input
          type="text"
          placeholder="MSSV / Tài khoản"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900"
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-900"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          // disabled={loading || !username || !password}
          className="bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-400">
        Hệ thống dành riêng cho Giảng viên và Sinh viên Đại học Công nghiệp TP.HCM.
      </p>
    </div>
  )
}

/* ---------- Thẻ Khoa/Viện (mở rộng xem môn) ---------- */
function FacultyCard({ faculty, onLogin }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
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
