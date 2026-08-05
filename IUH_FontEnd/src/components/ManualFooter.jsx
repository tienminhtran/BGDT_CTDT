import { ExternalLink, Mail, MapPin, Phone, Link2 } from 'lucide-react'
import logo from '../assets/logo-white.svg'

const LINKS = [
  { label: 'Website Tuyển sinh', href: 'https://tuyensinh.iuh.edu.vn/' },
  { label: 'Website Phòng đào tạo', href: 'https://pdt.iuh.edu.vn/' },
  { label: 'Cổng Thông tin sinh viên', href: 'https://sv.iuh.edu.vn/' },
  { label: 'Cổng Khóa Học LMS', href: 'https://lms.iuh.edu.vn/' },
]

export default function ManualFooter() {
  return (
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
        <div className="mb-6 grid grid-cols-1 gap-y-6 md:gap-6 lg:grid-cols-4 lg:gap-x-0 lg:gap-6">
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

          <div className="group relative overflow-hidden bg-transparent p-1 text-white shadow-none transition duration-300 hover:translate-y-0">
            <div className="flex items-start gap-3">
              <span className="mt-1 text-cyan-100">
                <Link2 size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-wide text-white/95">Liên kết nhanh</h3>
                <ul className="mt-2 space-y-2 text-sm text-white/85">
                  {LINKS.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white transition hover:text-cyan-100 hover:underline"
                      >
                        <span>{item.label}</span>
                        {/* <ExternalLink size={14} /> */}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full border-t border-white/15 pt-6">
          <div className="flex flex-col flex-wrap gap-2 lg:flex-row lg:items-center">
            <div className="flex flex-row flex-wrap justify-center gap-2 shrink-0 md:justify-start md:gap-4">
            </div>
            <div className="w-full flex-1 text-center text-base font-normal leading-6 lg:text-right">
              © 2026 Phòng Đào Tạo - version v2.2.0
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}