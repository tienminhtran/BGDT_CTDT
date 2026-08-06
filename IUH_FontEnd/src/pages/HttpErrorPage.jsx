import { ArrowLeft, Home, ShieldAlert, ServerOff, TriangleAlert } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROUTES } from '../constants'
import TieuDeTrang from '../components/TieuDeTrang'

const STATUS_META = {
  403: {
    title: '403 Forbidden',
    subtitle: 'Máy chủ đã từ chối yêu cầu này.',
    message:
      'Tài khoản hiện tại không có quyền truy cập tài nguyên này hoặc phiên đăng nhập không hợp lệ.',
    icon: ShieldAlert,
  },
  404: {
    title: '404 Not Found',
    subtitle: 'Không tìm thấy dữ liệu trên máy chủ.',
    message: 'Liên kết hoặc tài nguyên bạn vừa mở không còn tồn tại.',
    icon: TriangleAlert,
  },
  500: {
    title: '500 Internal Server Error',
    subtitle: 'Máy chủ đang gặp sự cố.',
    message: 'Vui lòng thử lại sau ít phút hoặc liên hệ quản trị hệ thống nếu lỗi vẫn còn.',
    icon: ServerOff,
  },
}

function normalizeStatus(rawStatus) {
  const parsed = Number(rawStatus)
  return STATUS_META[parsed] ? parsed : 500
}

export default function HttpErrorPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const status = normalizeStatus(searchParams.get('status'))
  const meta = STATUS_META[status]
  const Icon = meta.icon
  const detailMessage = searchParams.get('message') || meta.message
  const source = searchParams.get('source')

  const primaryTarget = user ? ROUTES.dashboard : ROUTES.home

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(21,56,152,0.18),_transparent_45%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] text-slate-800">
      <TieuDeTrang tieuDe={meta.title} moTa="Trang lỗi do server trả về." />

      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <section className="grid w-full gap-8 overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_24px_90px_rgba(15,23,42,0.12)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div className="flex flex-col justify-center">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
              <Icon size={16} />
              Lỗi từ server
            </span>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              {meta.title}
            </h1>
            <p className="mt-3 text-lg font-medium text-slate-700">{meta.subtitle}</p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">{detailMessage}</p>

            {source ? (
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Nguồn lỗi: <span className="font-medium text-slate-700">{source}</span>
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to={primaryTarget}
                className="inline-flex items-center gap-2 rounded-xl bg-[#153898] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-[#0f2f82]"
              >
                <Home size={16} />
                {user ? 'Về trang chủ' : 'Về trang đăng nhập'}
              </Link>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Quay lại
              </button>
            </div>
          </div>

          <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#0f2f82_0%,#153898_45%,#1d4ed8_100%)] p-6 text-white shadow-xl">
            <div className="absolute -left-14 top-6 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-yellow-400/20 blur-3xl" />

            <div className="relative z-10 max-w-sm text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15">
                <Icon size={40} />
              </div>
              <h2 className="text-2xl font-bold">{meta.title}</h2>
              <p className="mt-3 text-sm leading-6 text-blue-50/90">
                Nếu lỗi này lặp lại, hãy thử tải lại trang hoặc quay về màn hình trước để tiếp tục.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}