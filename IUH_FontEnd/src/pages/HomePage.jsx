import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

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
    backgroundImage:
      "linear-gradient(rgba(11,42,90,0.88), rgba(11,42,90,0.94)), url('/campus.jpg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }

  return (
    <div className="w-full text-slate-800">
      {/* ===== 1. HERO & ĐĂNG NHẬP ===== */}
      <section className="relative flex min-h-screen w-full items-center" style={heroBg}>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2">
          {/* Giới thiệu */}
          <div className="text-center text-white lg:text-left">
            <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              HỆ THỐNG BÀI GIẢNG ĐIỆN TỬ IUH
            </h1>
            <p className="mt-5 text-lg text-blue-100">
              Kho học liệu số chính thức của Trường Đại học Công nghiệp TP.HCM —
              học mọi lúc, mọi nơi.
            </p>
          </div>

          {/* Form đăng nhập (hiển thị trực tiếp) */}
          <LoginForm login={login} />
        </div>

        {/* Mũi tên cuộn xuống */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-2xl text-white/70">
          ↓
        </div>
      </section>

      {/* ===== 2. GIỚI THIỆU & THỐNG KÊ ===== */}
      <section className="w-full bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold text-blue-900">
            Về Hệ thống Bài giảng Điện tử IUH
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Nền tảng tập trung toàn bộ học liệu số được chuẩn hóa của các Khoa/Viện,
            phục vụ việc dạy và học chủ động cho hàng chục nghìn sinh viên.
          </p>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              { end: 500, suffix: '+', label: 'Học phần trực tuyến' },
              { end: 20000, suffix: '+', label: 'Bài giảng / Video chất lượng cao' },
              { end: 100, suffix: '%', label: 'Giảng viên chuẩn hóa học liệu số' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
              >
                <div className="text-4xl font-extrabold text-red-700">
                  <CountUp end={s.end} suffix={s.suffix} />
                </div>
                <p className="mt-2 text-slate-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 3. KHOA / VIỆN ĐÀO TẠO ===== */}
      <section className="w-full py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-blue-900">
            Kho bài giảng theo Khoa / Viện
          </h2>
          <p className="mt-3 text-center text-slate-600">
            Chọn một Khoa để xem các môn học công khai. Đăng nhập để vào học.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FACULTIES.map((f) => (
              <FacultyCard key={f.name} faculty={f} onLogin={scrollToTop} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4. TRỢ GIÚP & HƯỚNG DẪN ===== */}
      <section className="w-full bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-blue-900">
            Trợ giúp & Hướng dẫn
          </h2>

          {/* 3 bước */}
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              ['1', 'Bấm Đăng nhập', 'Chọn "Đăng nhập bằng tài khoản LMS" ở đầu trang.'],
              ['2', 'Nhập tài khoản', 'Dùng tài khoản (MSSV) do trường cấp.'],
              ['3', 'Chọn môn học', 'Vào danh sách môn học và bắt đầu xem bài giảng.'],
            ].map(([n, t, d]) => (
              <div key={n} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-900 font-bold text-white">
                  {n}
                </div>
                <h3 className="mt-4 font-semibold text-slate-800">{t}</h3>
                <p className="mt-1 text-sm text-slate-600">{d}</p>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-12 max-w-3xl space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-xl border border-slate-200 bg-white p-4"
              >
                <summary className="cursor-pointer list-none font-medium text-slate-800 marker:hidden">
                  <span className="text-red-700">▸ </span>
                  {f.q}
                </summary>
                <p className="mt-2 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href="/huong-dan-su-dung.pdf"
              target="_blank"
              rel="noreferrer"
              className="inline-block rounded-xl border-2 border-blue-900 px-6 py-3 font-semibold text-blue-900 transition hover:bg-blue-900 hover:text-white"
            >
              📄 Hướng dẫn sử dụng hệ thống (PDF)
            </a>
          </div>
        </div>
      </section>

      {/* ===== 5. CHÂN TRANG ===== */}
      <footer className="w-full bg-blue-950 py-12 text-blue-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-3">
          <div>
            <h3 className="text-lg font-bold text-white">IUH · Bài giảng điện tử</h3>
            <p className="mt-3 text-sm">
              © 2026 Trường Đại học Công nghiệp TP.HCM (IUH).
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Liên hệ</h4>
            <p className="mt-3 text-sm">Phòng Đào tạo</p>
            <p className="text-sm">Trung tâm Công nghệ Thông tin IUH</p>
          </div>
          <div>
            <h4 className="font-semibold text-white">Hỗ trợ kỹ thuật</h4>
            <p className="mt-3 text-sm">Hotline: (028) 3894 0390</p>
            <p className="text-sm">Email: cntt@iuh.edu.vn</p>
          </div>
        </div>
      </footer>
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
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <img
        src="/iuh-logo.png"
        alt="IUH"
        className="mx-auto h-20 w-20 object-contain"
        onError={(e) => (e.currentTarget.style.display = 'none')}
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
          disabled={loading || !username || !password}
          className="rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập bằng tài khoản LMS'}
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
