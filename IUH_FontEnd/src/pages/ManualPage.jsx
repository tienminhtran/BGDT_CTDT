import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LogIn,
  BookOpen,
  Star,
  History,
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../constants'
import LogoIllustration from '../components/Logoillustration'
import TieuDeTrang from '../components/TieuDeTrang'
import logo from '../assets/logo-white.svg'
import logoWhite from '../assets/logo-white.svg'
import buoc1 from '../assets/Buoc_1.png'
import buoc2 from '../assets/Buoc_2.png'
import buoc3 from '../assets/Buoc_3.png'
import buoc4 from '../assets/Buoc_4.png'

/* ---------- Dữ liệu 4 bước hướng dẫn ---------- */
const STEPS = [
  {
    icon: LogIn,
    img: buoc1,
    title: 'Đăng nhập hệ thống',
    desc: 'Tại trang đăng nhập dành cho sinh viên, nhập mã số sinh viên và mật khẩu tài khoản LMS do nhà trường cấp, sau đó nhấn nút Đăng nhập.',
    tags: ['Tài khoản LMS', 'Mã số sinh viên'],
  },
  {
    icon: BookOpen,
    img: buoc2,
    title: 'Chọn môn học cần xem',
    desc: 'Sau khi đăng nhập, màn hình hiển thị danh sách các môn học của bạn. Nhấn vào nút "Bài giảng" của môn học muốn xem để mở nội dung bài giảng.',
    tags: ['Danh sách môn học', 'Bài giảng'],
  },
  {
    icon: Star,
    img: buoc3,
    title: 'Xem & đánh giá bài giảng',
    desc: 'Màn hình xem bài giảng hiển thị. Sinh viên chọn một chương hoặc chuyên đề muốn xem. Tại đây có thể đánh giá bài giảng bằng số sao và để lại bình luận.',
    tags: ['Chương / Chuyên đề', 'Đánh giá sao', 'Bình luận'],
  },
  {
    icon: History,
    img: buoc4,
    title: 'Xem lại & lưu trữ',
    desc: 'Xem lại các đánh giá và bài giảng đã học. Nếu khóa học trên LMS bị mất hoặc hết hạn, sinh viên vẫn có thể xem lại bài giảng được lưu trữ tại đây.',
    tags: ['Lưu trữ', 'Xem lại bài giảng'],
  },
]

export default function ManualPage() {
  const { user } = useAuth()

  // Trang này tĩnh (không gọi API) nên loading ở đây là GIẢ LẬP: hiện màn chờ
  // LogoIllustration một nhịp cho hiệu ứng reveal chạy xong rồi mới lộ nội dung.
  const [dangTai, setDangTai] = useState(true)
  const [heroGlow, setHeroGlow] = useState({ x: '50%', y: '35%' })

  useEffect(() => {
    const t = setTimeout(() => setDangTai(false), 2200)
    return () => clearTimeout(t)
  }, [])

  const handleHeroMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setHeroGlow({ x: `${x}%`, y: `${y}%` })
  }

  if (dangTai) {
    return (
      <div className="grid min-h-screen w-full place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-[500px]">
          <LogoIllustration />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">
      <TieuDeTrang
        tieuDe="Hướng dẫn sử dụng"
        moTa="Các bước đăng nhập và xem bài giảng điện tử trên hệ thống IUH."
      />

      {/* ===== Thanh điều hướng ===== */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-blue-800/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* nhấn logo quay về login */}
          <Link to={ROUTES.home} aria-label="Về trang chủ">
            <img src={logoWhite} alt="IUH" className="h-9 cursor-pointer object-contain" />
          </Link>
          <Link
            to={user ? ROUTES.dashboard : ROUTES.home}
            aria-label={user ? 'Vào khóa học' : 'Đăng nhập'}
           className="relative inline-flex items-center gap-1 overflow-hidden bg-blue-700 px-2 py-2 text-sm font-semibold text-white shadow-lg transition before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
          >
            <LogIn size={20} />
            {user ? 'Vào khóa học' : 'Đăng nhập'}
          </Link>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-blue-500 text-white"
        onMouseMove={handleHeroMove}
        onMouseLeave={() => setHeroGlow({ x: '50%', y: '35%' })}
        style={{
          '--hero-x': heroGlow.x,
          '--hero-y': heroGlow.y,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            backgroundImage:
              'radial-gradient(circle 160px at var(--hero-x) var(--hero-y), rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 35%, transparent 72%)',
          }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96  bg-white/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 bg-cyan-300/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-6 py-16 text-center sm:py-20">
          <span className="inline-flex items-center gap-2  bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
            <GraduationCap size={16} />
            Hệ thống Bài giảng điện tử 
          </span>
          <h1 className="mt-6 text-3xl font-bold drop-shadow sm:text-5xl">
            Hướng dẫn sử dụng
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-blue-100 sm:text-lg">
            Chỉ với 4 bước đơn giản, sinh viên có thể đăng nhập, xem, đánh giá và
            lưu trữ lại các bài giảng điện tử của mình.
          </p>

          {/* Chip 4 bước tóm tắt */}
          <div className="mx-auto mt-8 flex max-w-xl flex-wrap items-center justify-center gap-2 text-sm">
            {STEPS.map((s, i) => (
              <span key={s.title} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 backdrop-blur">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white text-xs font-bold text-blue-700">
                    {i + 1}
                  </span>
                  {s.title}
                </span>
                {i < STEPS.length - 1 && (
                  <ChevronRight size={14} className="hidden text-white/50 sm:block" />
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 4 bước chi tiết ===== */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="space-y-10">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            const reversed = i % 2 === 1
            return (
              <article
                key={step.title}
                className="grid items-center gap-8 border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-8 lg:grid-cols-2"
              >
                {/* Ảnh minh họa */}
                <div className={reversed ? 'lg:order-2' : ''}>
                  <div className="group overflow-hidden border border-slate-200 bg-slate-100 shadow-inner">
                    <img
                      src={step.img}
                      alt={`Bước ${i + 1}: ${step.title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                </div>

                {/* Nội dung */}
                <div className={reversed ? 'lg:order-1' : ''}>
                  <div className="flex items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center border-r border-slate-500 text-[#000e91]">
                      <Icon size={26} />
                    </span>
                    
                    <div>
                      <span className="text-sm font-semibold uppercase tracking-wide text-blue-600">
                        Bước {i + 1}
                      </span>
                      <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
                        {step.title}
                      </h2>
                    </div>
                  </div>

                  <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                    {step.desc}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {step.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {/* CTA đăng nhập */}
        <div className="mt-12 flex justify-center">
          <Link
            to={user ? ROUTES.dashboard : ROUTES.home}
            aria-label={user ? 'Vào khóa học' : 'Đăng nhập'}
            className="relative inline-flex items-center gap-1 overflow-hidden bg-blue-700 px-2 py-2 text-sm font-semibold text-white shadow-lg transition before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/40 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
          >
            <LogIn size={20} />
            {user ? 'Truy cập khóa học' : 'Bắt đầu đăng nhập ngay'}
          </Link>
        </div>
      </section>

      {/* ===== Footer / Thông tin liên hệ ===== */}
      <footer className="relative overflow-hidden bg-blue-800 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{ backgroundImage: 'url(https://iuh.edu.vn/assets/images/bg-footermb.jpg)' }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 hidden bg-cover bg-center md:block"
          style={{ backgroundImage: 'url(https://iuh.edu.vn/assets/images/bg-footer.jpg)' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-blue-900/35" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col-reverse px-4 pb-5 pt-8 lg:flex-col lg:pb-4 lg:pt-10">
          <div className="mb-6 grid grid-cols-1 gap-y-6 md:gap-6 lg:grid-cols-3 lg:gap-x-0 lg:gap-6">
            <div className="group relative overflow-hidden bg-transparent p-1 text-white shadow-none transition duration-300 hover:translate-y-0">
              <div className="flex flex-col gap-3">
                <div className="flex justify-start">
                  <img
                    src={logo}
                    alt="IUH"
                    className="h-12 w-auto shrink-0 object-contain md:h-14"
                  />
                </div>
                <img
                  src={logo}
                  alt="IUH"
                  className="hidden h-12 w-auto shrink-0 object-contain md:h-14"
                />
                <div className="flex items-start gap-3">
                  <span className="mt-1 text-cyan-100">
                    <MapPin size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold tracking-wide text-white/95">
                      Địa chỉ
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/85">
                      Số 12 Nguyễn Văn Bảo, P. Hạnh Thông, TP. Hồ Chí Minh
                    </p>
                    <p className="mt-2 inline-block text-sm font-medium text-cyan-100">
                      Phòng Đào tạo - Tầng trệt - Nhà B
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-transparent p-1 text-white shadow-none transition duration-300 hover:translate-y-0">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-cyan-100">
                  <Phone size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-wide text-white/95">
                    Điện thoại
                  </h3>
                  <ul className="mt-2 space-y-2 text-sm text-white/85">
                    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <span className="text-white/70">Phòng Đào tạo</span>
                      <a href="tel:02838940390" className="font-semibold text-white hover:underline">
                        0283.8940390 - 525
                      </a>
                    </li>
                    <li className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <span className="text-white/70">Tuyển sinh</span>
                      <a href="tel:02839851932" className="font-semibold text-white hover:underline">
                        028 3985 1932
                      </a>
                    </li>
                    <li className="flex flex-wrap items-center justify-end gap-3">
                      <a href="tel:02838955858" className="font-semibold text-white hover:underline">
                        028 3895 5858
                      </a>
                      <a href="tel:02839851917" className="font-semibold text-white hover:underline">
                        028 3985 1917
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-transparent p-1 text-white shadow-none transition duration-300 hover:translate-y-0">
              <div className="flex items-start gap-3">
                <span className="mt-1 text-cyan-100">
                  <Mail size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold tracking-wide text-white/95">Email</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/85">
                    Gửi email cho chúng tôi, phản hồi trong giờ hành chính.
                  </p>
                  <a
                    href="mailto:phongdaotao@iuh.edu.vn"
                    className="mt-4 inline-flex items-center gap-2 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/15"
                  >
                    <Mail size={14} />
                    phongdaotao@iuh.edu.vn
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full border-t border-white/15 pt-6">
            <div className="flex flex-col flex-wrap gap-2 lg:flex-row">
              <div className="flex flex-row flex-wrap justify-center gap-2 md:justify-start md:gap-4 shrink-0" />
              <div className="w-full flex-1 text-center text-base font-normal leading-6 lg:text-right">
                © 2026 Phòng Đào Tạo - Bản quyền nội dung thuộc về IUH.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
