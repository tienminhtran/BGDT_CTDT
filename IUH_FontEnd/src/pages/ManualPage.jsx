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
import ManualFooter from '../components/ManualFooter'
import TieuDeTrang from '../components/TieuDeTrang'
import logoWhite from '../assets/logo-white.svg'
import buoc1 from '../assets/buoc_1_hdsd.webp'
import buoc2 from '../assets/buoc_2_hdsd.webp'
import buoc3 from '../assets/buoc_3_hdsd.webp'
import buoc4 from '../assets/buoc_4_hdsd.webp'

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

  useEffect(() => {
    const t = setTimeout(() => setDangTai(false), 2200)
    return () => clearTimeout(t)
  }, [])

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
        className="relative overflow-hidden bg-[#153898] text-white"
      >
        <div className="relative mx-auto flex max-w-6xl items-center justify-center px-6 py-16 sm:py-20">
          <div className="relative z-10 max-w-full text-center">
            <span className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 text-sm font-medium">
              <GraduationCap size={16} />
              Hệ thống Bài giảng điện tử
            </span>
            <h1 className="mt-6 text-3xl font-bold drop-shadow sm:text-5xl">
              Hướng dẫn sử dụng
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-blue-100 sm:text-lg">
              Quy trình 4 bước tối ưu giúp sinh viên dễ dàng truy cập, theo dõi, đánh giá và quản lý kho bài giảng điện tử cá nhân.
            </p>

            {/* Chip 4 bước tóm tắt */}
            <div className="mx-auto mt-8 flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-2 gap-y-3 md:flex-nowrap md:overflow-x-auto md:px-1 sm:gap-x-3">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex shrink-0 items-center">
                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-center shadow-[0_10px_25px_rgba(6,18,78,0.18)] backdrop-blur-sm sm:px-4">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-blue-700 sm:h-7 sm:w-7 sm:text-xs">
                      {i + 1}
                    </span>
                    <span className="whitespace-nowrap text-sm font-medium text-white/95 sm:text-base">
                      {s.title}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ChevronRight size={16} className="mx-1 shrink-0 text-white/60 sm:mx-2" />
                  )}
                </div>
              ))}
            </div>
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

      <ManualFooter />
    </div>
  )
}
