import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PlayCircle, Loader2, Lock, Star, MessageSquare, Send } from 'lucide-react'
import Layout from '../components/Layout'
import HlsPlayer from '../components/HlsPlayer'
import { useAuth } from '../contexts/AuthContext'
import { baiGiangService, sinhVienHocPhanService, danhGiaService } from '../services'
import { ROUTES } from '../constants'

const tieuDe = (v) => v?.tenBaiGiang || v?.noiDungChuong || 'Bài giảng'

const formatNgay = (v) => {
  if (!v) return ''
  try {
    return new Date(v).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/* ---------- Sao chỉ để hiển thị (read-only) ---------- */
function StarsDisplay({ value = 0, size = 16 }) {
  const rounded = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value}/5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={
            n <= rounded ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-slate-300'
          }
        />
      ))}
    </span>
  )
}

/* ---------- Hook: tải đánh giá + đánh giá của chính SV cho 1 bài giảng ---------- */
function useDanhGia(baiGiangId) {
  const [state, setState] = useState({
    loading: true,
    summary: null,
    myRating: null,
    error: '',
  })

  const refresh = useCallback(async () => {
    if (!baiGiangId) {
      setState({ loading: false, summary: null, myRating: null, error: '' })
      return
    }
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const [ds, mine] = await Promise.all([
        danhGiaService.getDanhGia(baiGiangId),
        danhGiaService.getDanhGiaCuaToi(baiGiangId).catch(() => null),
      ])
      setState({
        loading: false,
        summary: ds,
        myRating: mine,
        error: '',
      })
    } catch (err) {
      setState({
        loading: false,
        summary: null,
        myRating: null,
        error: err?.response?.data?.message || 'Không tải được đánh giá',
      })
    }
  }, [baiGiangId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...state, refresh }
}

/* ---------- Khu đánh giá của chính SV (xem / sửa) ---------- */
function DanhGiaSection({ baiGiangId, dg }) {
  const { loading, myRating, error, refresh } = dg

  const [soSao, setSoSao] = useState(0)
  const [hover, setHover] = useState(0)
  const [binhLuan, setBinhLuan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Đổ lại form khi đổi bài giảng / có đánh giá cũ
  useEffect(() => {
    setSoSao(myRating?.SoSao || 0)
    setBinhLuan(myRating?.BinhLuan || '')
    setHover(0)
    setFormError('')
  }, [myRating, baiGiangId])

  const submit = async () => {
    if (!soSao) {
      setFormError('Vui lòng chọn số sao')
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const payload = { soSao, binhLuan: binhLuan.trim() || null }
      if (myRating) await danhGiaService.suaDanhGia(baiGiangId, payload)
      else await danhGiaService.taoDanhGia(baiGiangId, payload)
      await refresh()
    } catch (err) {
      setFormError(err?.response?.data?.message || 'Không gửi được đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  if (!baiGiangId) return null

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
        <MessageSquare size={18} className="text-[#115EA8]" />
        Đánh giá của bạn
        {loading ? <Loader2 className="animate-spin text-slate-400" size={15} /> : null}
      </h2>

      {/* Form đánh giá của chính SV (prefill nếu đã từng đánh giá) */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Số sao:</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = n <= (hover || soSao)
              return (
                <button
                  key={n}
                  type="button"
                  aria-label={`Chọn ${n} sao`}
                  onClick={() => setSoSao(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    size={24}
                    className={
                      filled
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-slate-300'
                    }
                  />
                </button>
              )
            })}
          </div>
          {soSao ? <span className="text-sm text-slate-500">{soSao}/5</span> : null}
        </div>

        <textarea
          value={binhLuan}
          onChange={(e) => setBinhLuan(e.target.value)}
          maxLength={255}
          rows={3}
          placeholder="Chia sẻ cảm nhận của bạn về bài giảng này..."
          className="mt-3 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#115EA8] focus:ring-1 focus:ring-[#115EA8]"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">{binhLuan.length}/255</span>
          <div className="flex items-center gap-3">
            {formError ? <span className="text-xs text-red-600">{formError}</span> : null}
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#115EA8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0d4a82] disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              {myRating ? 'Cập nhật' : 'Gửi đánh giá'}
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {myRating ? (
        <p className="mt-2 text-xs text-slate-400">
          Bạn đã đánh giá lúc {formatNgay(myRating.NgayDanhGia)}
        </p>
      ) : null}
    </div>
  )
}

export default function CoursePlayerPage() {
  const { user, logout } = useAuth()
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
    sinhVienHocPhanService
      .kiemTraQuyen(maMon)
      .then((allowed) => alive && setAccess({ loading: false, allowed }))
      .catch(() => alive && setAccess({ loading: false, allowed: false }))
    return () => {
      alive = false
    }
  }, [maMon])

  // Lấy danh sách video theo mã môn + phiên bản
  useEffect(() => {
    let alive = true
    setVideos({ loading: true, items: [], error: '' })
    baiGiangService
      .getDanhSachVideo(maMon, version)
      .then((items) => {
        if (!alive) return
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
    baiGiangService
      .getPlaybackToken(active.baiGiangId)
      .then((url) => alive && setPlaySrc(url))
      .catch(() => alive && setPlaySrc(null))
    return () => {
      alive = false
    }
  }, [active?.baiGiangId, active?.coHls])

  // Đánh giá / bình luận của bài giảng đang xem
  const dg = useDanhGia(active?.baiGiangId ?? null)

  const BackButton = (
    <button
      type="button"
      onClick={() => navigate(ROUTES.dashboard)}
      className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#115EA8]"
    >
      <ArrowLeft size={16} />
      Về danh sách môn học
    </button>
  )

  if (access.loading) {
    return (
      <Layout user={user} onLogout={logout}>
        <main className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 py-20 text-slate-500">
          <Loader2 className="animate-spin" size={18} />
          Đang kiểm tra quyền truy cập...
        </main>
      </Layout>
    )
  }

  if (!access.allowed) {
    return (
      <Layout user={user} onLogout={logout}>
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
    <Layout user={user} onLogout={logout}>
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6">
        {BackButton}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* ===== Cột video (trái) ===== */}
          <div className="min-w-0">
            {/* Khung video 16:9 cố định, giới hạn chiều cao để không phình quá to */}
            <div className="mx-auto w-full max-w-[1100px]">
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
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

              {/* Tên chương */}
              <h1 className="mt-4 text-xl font-bold leading-snug text-slate-800">
                {active ? tieuDe(active) : 'Bài giảng'}
              </h1>

              {/* Dòng phiên bản + điểm trung bình (chỉ hiển thị) canh hai bên */}
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-500">
                  Môn {maMon}
                  {version ? ` · Phiên bản ${version}` : ''}
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                  <StarsDisplay value={dg.summary?.diemTrungBinh || 0} size={16} />
                  <span className="font-medium text-slate-600">
                    {dg.summary?.diemTrungBinh
                      ? `${dg.summary.diemTrungBinh.toFixed(1)}/5`
                      : 'Chưa có'}
                  </span>
                  <span className="text-slate-400">({dg.summary?.tongSoDanhGia || 0})</span>
                </span>
              </div>

              <div className="mt-4 rounded-xl border-slate-200 bg-gray-200 p-4 text-sm leading-relaxed text-slate-600">
                <h2 className="mb-2 font-semibold text-slate-800">Mô tả bài học</h2>
                {active?.noiDungChuong || 'Sinh viên theo dõi video bên trên và chuyển bài bằng danh sách bên phải.'}
              </div>

              {/* Bình luận + đánh giá sao (tương tác) */}
              <DanhGiaSection baiGiangId={active?.baiGiangId ?? null} dg={dg} />
            </div>
          </div>

          {/* ===== Danh sách video (phải) — dính khi cuộn trên desktop ===== */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
                <ul className="divide-y divide-slate-100 lg:max-h-[70vh] lg:overflow-y-auto">
                  {list.map((v, i) => {
                    const isActive = v.baiGiangId === active?.baiGiangId
                    return (
                      <li key={v.baiGiangId}>
                        <button
                          type="button"
                          onClick={() => setActiveId(v.baiGiangId)}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50 ${
                            isActive ? 'bg-[#115EA8]/10' : ''
                          }`}
                        >
                          {/* Ô thumbnail mini 16:9 + số thứ tự (kiểu YouTube) */}
                          <span
                            className={`flex aspect-video w-24 shrink-0 items-center justify-center rounded-md text-sm font-semibold ${
                              isActive
                                ? 'bg-[#115EA8] text-white'
                                : 'bg-slate-100 text-slate-500'
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
                            <span className="mt-0.5 block text-xs text-slate-400">
                              Bài {i + 1}
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
