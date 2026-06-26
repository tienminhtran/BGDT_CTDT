import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PlayCircle, Loader2, Maximize2, Minimize2, ChevronDown } from 'lucide-react'
import Layout from '../components/Layout'
import HlsPlayer from '../components/HlsPlayer'
import { baiGiangService } from '../services'

const tieuDe = (v) => v?.tenBaiGiang || v?.noiDungChuong || 'Bài giảng'

/* ---------- Nội dung danh sách bài giảng (dùng lại cho cột phải & dropdown) ---------- */
function DanhSachBody({ list, videos, active, onSelect }) {
  if (videos.loading) {
    return (
      <p className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} /> Đang tải...
      </p>
    )
  }
  if (videos.error) {
    return <p className="px-4 py-6 text-sm text-red-600">{videos.error}</p>
  }
  if (!list.length) {
    return <p className="px-4 py-6 text-sm text-slate-500">Chưa có bài giảng nào.</p>
  }
  return (
    <ul className="divide-y divide-slate-100 lg:max-h-[70vh] lg:overflow-y-auto">
      {list.map((v, i) => {
        const isActive = v.baiGiangId === active?.baiGiangId
        return (
          <li key={v.baiGiangId}>
            <button
              type="button"
              onClick={() => onSelect(v.baiGiangId)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                isActive ? 'bg-[#115EA8]/10' : ''
              }`}
            >
              {/* Ô thumbnail mini 16:9 + số thứ tự (kiểu YouTube) */}
              <span
                className={`flex aspect-video w-24 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
                  isActive ? 'bg-[#115EA8] text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isActive ? <PlayCircle size={20} /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`line-clamp-2 text-sm font-medium ${
                    isActive ? 'text-[#0d4a82]' : 'text-slate-700'
                  }`}
                >
                  {tieuDe(v)}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">Bài {i + 1}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export default function CoursePlayerPage() {
  // Token mờ do backend cấp; client KHÔNG giải được mã môn từ đây.
  const { token } = useParams()
  const [activeId, setActiveId] = useState(null)

  // Phóng to: video chiếm toàn chiều rộng, danh sách bài giảng thu gọn thành dropdown.
  const [expanded, setExpanded] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  // Danh sách video + tên môn/phiên bản (để hiển thị) — backend trả về theo token
  const [videos, setVideos] = useState({
    loading: true,
    items: [],
    subjectName: null,
    version: null,
    error: '',
  })

  // Lấy danh sách video theo token mờ
  useEffect(() => {
    let alive = true
    setVideos({ loading: true, items: [], subjectName: null, version: null, error: '' })
    baiGiangService
      .getDanhSachVideo(token)
      .then(({ subjectName, version, videos: items }) => {
        if (!alive) return
        setVideos({ loading: false, items, subjectName, version, error: '' })
        setActiveId(items[0]?.baiGiangId ?? null)
      })
      .catch((err) => {
        if (!alive) return
        setVideos({
          loading: false,
          items: [],
          subjectName: null,
          version: null,
          error: err?.response?.data?.message || 'Không tải được danh sách bài giảng',
        })
      })
    return () => {
      alive = false
    }
  }, [token])

  const list = videos.items
  const active = list.find((v) => v.baiGiangId === activeId) ?? list[0] ?? null

  // Lấy token phát HLS qua backend (bucket private) cho video đang chọn
  const [playSrc, setPlaySrc] = useState(null)
  useEffect(() => {
    let alive = true
    setPlaySrc(null)
    if (!active?.baiGiangId || !active?.coHls) return
    baiGiangService
      .getPlaybackToken(active.baiGiangId)
      .then((url) => alive && setPlaySrc(url))
      .catch(() => alive && setPlaySrc(null))
    return () => {
      alive = false
    }
  }, [active?.baiGiangId, active?.coHls])

  // Chọn bài trong dropdown -> đóng dropdown cho gọn
  const chonBai = (id) => {
    setActiveId(id)
    setListOpen(false)
  }

  return (
    <Layout>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6">
        <div className={expanded ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]'}>
          {/* ===== Cột video (trái) ===== */}
          <div className="min-w-0">
            <div className={`mx-auto w-full ${expanded ? '' : 'max-w-[1100px]'}`}>
              <div className="relative aspect-video w-full overflow-hidden bg-black shadow-sm">
                {playSrc ? (
                  <HlsPlayer
                    key={active.baiGiangId}
                    src={playSrc}
                    className="h-full w-full"
                    watermark="Đây là bài giảng điện tử thuộc bản quyền Đại học Công nghiệp Thành Phố Hồ Chí Minh"
                    allowFullscreen={false}
                  />
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

              {/* Tên chương + nút phóng to/thu nhỏ */}
              <div className="mt-4 flex items-start justify-between gap-3">
                <h1 className="text-xl font-bold leading-snug text-slate-800">
                  {active ? tieuDe(active) : 'Bài giảng'}
                </h1>
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-[#115EA8] hover:text-[#115EA8]"
                >
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  {expanded ? 'Thu nhỏ' : 'Phóng to'}
                </button>
              </div>

              {/* Dòng phiên bản (chỉ hiển thị) */}
              <p className="mt-1 text-sm text-slate-500">
                {videos.subjectName ? `Môn ${videos.subjectName}` : 'Bài giảng'}
                {videos.version ? ` · Phiên bản ${videos.version}` : ''}
              </p>

              {/* Khi phóng to: danh sách bài giảng dạng dropdown (thu gọn) */}
              {expanded ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setListOpen((o) => !o)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="font-semibold text-slate-800">
                      Danh sách bài giảng
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        {list.length} bài giảng
                      </span>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`text-slate-500 transition-transform ${listOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {listOpen ? (
                    <div className="border-t border-slate-100">
                      <DanhSachBody
                        list={list}
                        videos={videos}
                        active={active}
                        onSelect={chonBai}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border-slate-200 bg-gray-200 p-4 text-sm leading-relaxed text-slate-600">
                <h2 className="mb-2 font-semibold text-slate-800">Mô tả bài học</h2>
                {active?.noiDungChuong || 'Chọn bài giảng ở danh sách bên phải để xem video.'}
              </div>
            </div>
          </div>

          {/* ===== Danh sách video (phải) — chỉ hiện khi KHÔNG phóng to ===== */}
          {!expanded ? (
            <aside className="lg:sticky lg:top-20 lg:self-start">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h2 className="font-semibold text-slate-800">Danh sách bài giảng</h2>
                  <p className="text-xs text-slate-400">{list.length} bài giảng</p>
                </div>
                <DanhSachBody
                  list={list}
                  videos={videos}
                  active={active}
                  onSelect={setActiveId}
                />
              </div>
            </aside>
          ) : null}
        </div>
      </main>
    </Layout>
  )
}
