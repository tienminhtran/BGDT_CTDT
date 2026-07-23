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
import { ROUTES } from '../constants'
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
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800">
      {/* ===== Thanh điều hướng ===== */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-blue-800/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* nhấn logo quay về login */}
          <img src={logoWhite} alt="IUH" className="h-9 object-contain"/>
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-1 bg-blue-700 px-2 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-800"
          >
            <LogIn size={20} />
            Đăng nhập
          </Link>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-700 to-blue-500 text-white">
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
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-200">
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
            to={ROUTES.home}
            className="inline-flex items-center gap-2 bg-blue-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800"
          >
            <LogIn size={20} />
            Bắt đầu đăng nhập ngay
          </Link>
        </div>
      </section>

      {/* ===== Thông tin liên hệ ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-800 to-blue-700 py-20 text-white">
        {/* Khối trang trí nền */}
        <div
          className="pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="text-center">
            <span className="inline-flex items-center gap-2  bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
              <Phone size={15} />
              Hỗ trợ sinh viên
            </span>
            <h2 className="mt-5 text-2xl font-bold sm:text-4xl">
              Liên hệ Phòng Đào tạo
            </h2>
            <div className="mx-auto mt-4 h-1 w-20 bg-gradient-to-r from-cyan-300 to-blue-300" />
            <p className="mx-auto mt-4 max-w-2xl text-blue-100">
              Mọi thắc mắc về tài khoản, môn học và bài giảng, vui lòng liên hệ
              theo thông tin bên dưới.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Địa chỉ */}
            <div className="group relative overflow-hidden bg-white p-7 text-slate-700 shadow-xl transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
              <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 to-cyan-400" />
              <span className="grid h-14 w-14 place-items-center  bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-200 transition group-hover:scale-110">
                <MapPin size={24} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-800">Địa chỉ</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Số 12 Nguyễn Văn Bảo, P. Hạnh Thông, TP. Hồ Chí Minh
              </p>
              <p className="mt-2 inline-block rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                Phòng Đào tạo — Tầng trệt — Nhà B
              </p>
            </div>

            {/* Điện thoại */}
            <div className="group relative overflow-hidden  bg-white p-7 text-slate-700 shadow-xl transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
              <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 to-cyan-400" />
              <span className="grid h-14 w-14 place-items-center bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-200 transition group-hover:scale-110">
                <Phone size={24} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-800">Điện thoại</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Phòng Đào tạo</span>
                  <a href="tel:02838940390" className="font-semibold text-blue-700 hover:underline">
                    0283.8940390 — 525
                  </a>
                </li>
                <li className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Tuyển sinh</span>
                  <a href="tel:02839851932" className="font-semibold text-blue-700 hover:underline">
                    028 3985 1932
                  </a>
                </li>
                <li className="flex items-center justify-end gap-3">
                  <a href="tel:02838955858" className="font-semibold text-blue-700 hover:underline">
                    028 3895 5858
                  </a>
                  <a href="tel:02839851917" className="font-semibold text-blue-700 hover:underline">
                    028 3985 1917
                  </a>
                </li>
              </ul>
            </div>

            {/* Email */}
            <div className="group relative overflow-hidden bg-white p-7 text-slate-700 shadow-xl transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl">
              <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-600 to-cyan-400" />
              <span className="grid h-14 w-14 place-items-center  bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-200 transition group-hover:scale-110">
                <Mail size={24} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-800">Email</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Gửi email cho chúng tôi, phản hồi trong giờ hành chính.
              </p>
              <a
                href="mailto:phongdaotao@iuh.edu.vn"
                className="mt-4 inline-flex items-center gap-2 bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <Mail size={16} />
                phongdaotao@iuh.edu.vn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="bg-blue-900 py-6 text-center text-sm text-blue-100">
        © 2026 Phòng Đào tạo — Đại học Công nghiệp TP.HCM
      </footer>
    </div>
  )
}
