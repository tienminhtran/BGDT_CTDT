import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PlayCircle, Loader2, Lock } from 'lucide-react'
import Layout from './Layout'
import HlsPlayer from './HlsPlayer'
import http from '../api/http'

const tieuDe = (v) => v?.tenBaiGiang || v?.noiDungChuong || 'Bài giảng'

export default function CoursePlayer({ user, onLogout }) {
  const { maMon, version } = useParams()
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState(null)

  // Kiểm tra SV có quyền học môn này không (qua backend)
  const [access, setAccess] = useState({ loading: true, allowed: false })

  // Danh sách video bài giảng (gọi API)
  const [videos, setVideos] = useState({ loading: true, items: [], error: '' })

  useEffect(() => {
    let alive = true
    setAccess({ loading: true, allowed: false })
    http
      .get(`/sinhvien-hocphan/kiem-tra/${encodeURIComponent(maMon)}`)
      .then((res) => alive && setAccess({ loading: false, allowed: !!res.data.allowed }))
      .catch(() => alive && setAccess({ loading: false, allowed: false }))
    return () => {
      alive = false
    }
  }, [maMon])

  // Lấy danh sách video theo mã môn + phiên bản
  useEffect(() => {
    let alive = true
    setVideos({ loading: true, items: [], error: '' })
    http
      .get('/baigiang/danh-sach', { params: { maMon, version } })
      .then((res) => {
        if (!alive) return
        const items = res.data.videos || []
        setVideos({ loading: false, items, error: '' })
        setActiveId(items[0]?.baiGiangId ?? null)
      })
      .catch((err) => {
        if (!alive) return
        setVideos({
          loading: false,
          items: [],
          error: err?.response?.data?.message || 'Không tải được danh sách bài giảng',
        })
      })
    return () => {
      alive = false
    }
  }, [maMon, version])

  const list = videos.items
  const active = list.find((v) => v.baiGiangId === activeId) ?? list[0] ?? null

  // Lấy token phát HLS qua backend (bucket private) cho video đang chọn
  const [playSrc, setPlaySrc] = useState(null)
  useEffect(() => {
    let alive = true
    setPlaySrc(null)
    if (!active?.baiGiangId || !active?.coHls) return
    http
      .get(`/baigiang/${active.baiGiangId}/playback-token`)
      .then((res) => alive && setPlaySrc(res.data.url))
      .catch(() => alive && setPlaySrc(null))
    return () => {
      alive = false
    }
  }, [active?.baiGiangId, active?.coHls])

  const BackButton = (
    <button
      type="button"
      onClick={() => navigate('/trang-chu')}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-green-700"
    >
      <ArrowLeft size={16} />
      Về danh sách môn học
    </button>
  )

  if (access.loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <main className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 py-20 text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Đang kiểm tra quyền truy cập...
        </main>
      </Layout>
    )
  }

  if (!access.allowed) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <main className="mx-auto w-full max-w-full px-4 py-6">
          {BackButton}
          <div className="mx-auto mt-10 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <Lock className="mx-auto text-amber-500" size={32} />
            <h1 className="mt-3 font-semibold text-amber-800">
              Bạn không có quyền học môn này
            </h1>
            <p className="mt-1 text-sm text-amber-700">
              Môn học <span className="font-medium">{maMon}</span> không thuộc học phần
              nào bạn đang theo học.
            </p>
          </div>
        </main>
      </Layout>
    )
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {BackButton}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ===== Khung video (trái) ===== */}
          <div>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              {playSrc ? (
                <HlsPlayer key={active.baiGiangId} src={playSrc} className="h-full w-full" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-white/80">
                  <PlayCircle size={64} className="opacity-90" />
                  <p className="mt-3 text-sm">
                    {videos.loading
                      ? 'Đang tải video...'
                      : active?.coHls
                        ? 'Đang chuẩn bị trình phát...'
                        : active
                          ? 'Bài giảng chưa có bản phát (HLS)'
                          : 'Chưa có video bài giảng'}
                  </p>
                </div>
              )}
            </div>

            <h1 className="mt-4 text-lg font-bold text-slate-800">
              {active ? tieuDe(active) : 'Bài giảng'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Môn {maMon}
              {version ? ` · Phiên bản ${version}` : ''}
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
              <h2 className="mb-2 font-semibold text-slate-800">Mô tả bài học</h2>
              {active?.noiDungChuong || 'Sinh viên theo dõi video bên trên và chuyển bài bằng danh sách bên phải.'}
            </div>
          </div>

          {/* ===== Danh sách video (phải) ===== */}
          <aside className="lg:max-h-[80vh] lg:overflow-y-auto">
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="font-semibold text-slate-800">Danh sách bài giảng</h2>
                <p className="text-xs text-slate-400">{list.length} bài giảng</p>
              </div>

              {videos.loading ? (
                <p className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                  <Loader2 className="animate-spin" size={16} /> Đang tải...
                </p>
              ) : videos.error ? (
                <p className="px-4 py-6 text-sm text-red-600">{videos.error}</p>
              ) : !list.length ? (
                <p className="px-4 py-6 text-sm text-slate-500">Chưa có bài giảng nào.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {list.map((v, i) => {
                    const isActive = v.baiGiangId === active?.baiGiangId
                    return (
                      <li key={v.baiGiangId}>
                        <button
                          type="button"
                          onClick={() => setActiveId(v.baiGiangId)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                            isActive ? 'bg-green-50' : ''
                          }`}
                        >
                          <span className="mt-0.5 shrink-0">
                            <PlayCircle
                              size={18}
                              className={isActive ? 'text-green-700' : 'text-slate-400'}
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-sm font-medium ${
                                isActive ? 'text-green-800' : 'text-slate-700'
                              }`}
                            >
                              {i + 1}. {tieuDe(v)}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </Layout>
  )
}
