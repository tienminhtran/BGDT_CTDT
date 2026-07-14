import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Layers,
  Upload,
  Loader2,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  ExternalLink,
  Search,
  X,
} from 'lucide-react'
import HlsPlayer from '../components/HlsPlayer'
import PageHeading from '../components/PageHeading'
import { monHocService, baiGiangService } from '../services'
import { buildCoursePlayerPath, buildVideoTheoIdPath } from '../constants'

// Trang "Quản lý bài giảng": chọn môn/phiên bản, xem chương và upload video.
export default function QuanLyBaiGiangPage() {
  const navigate = useNavigate()

  const [monHoc, setMonHoc] = useState([])
  const [loadingMon, setLoadingMon] = useState(true)
  const [error, setError] = useState('')

  const [monHocId, setMonHocId] = useState('')
  const [versionId, setVersionId] = useState('')

  // Ô tìm môn theo mã môn (maTuQuan) thay cho việc liệt kê toàn bộ danh sách
  const [monSearch, setMonSearch] = useState('')
  const [showGoiY, setShowGoiY] = useState(false)

  const [chiTiet, setChiTiet] = useState([])
  const [loadingChiTiet, setLoadingChiTiet] = useState(false)

  const [openingPlayer, setOpeningPlayer] = useState(false)

  // Ô nhập nhanh "mã môn / phiên bản" -> vào thẳng trang xem video
  const [quickPath, setQuickPath] = useState('')
  // Ô nhập nhanh "mã bài giảng" (tb_BaiGiang) -> xem 1 video riêng lẻ
  const [quickId, setQuickId] = useState('')

  // 1) Lấy danh sách môn học + phiên bản
  useEffect(() => {
    monHocService
      .getMonHoc()
      .then(setMonHoc)
      .catch((err) =>
        setError(err?.response?.data?.message || 'Không tải được danh sách môn học')
      )
      .finally(() => setLoadingMon(false))
  }, [])

  const monDangChon = useMemo(
    () => monHoc.find((m) => String(m.id) === String(monHocId)),
    [monHoc, monHocId]
  )
  const versions = monDangChon?.versions || []

  // Lọc gợi ý theo mã môn (maTuQuan) hoặc tên môn — chỉ hiện tối đa 8 kết quả
  const goiYMon = useMemo(() => {
    const q = monSearch.trim().toLowerCase()
    if (!q) return []
    return monHoc
      .filter(
        (m) =>
          m.maTuQuan?.toLowerCase().includes(q) ||
          m.tenMon?.toLowerCase().includes(q)
      )
      .slice(0, 8)
  }, [monHoc, monSearch])

  // 2) Khi chọn phiên bản -> lấy chi tiết đăng ký bài giảng (các chương)
  const taiChiTiet = (vid) => {
    if (!vid) {
      setChiTiet([])
      return
    }
    setLoadingChiTiet(true)
    baiGiangService
      .getChiTiet(vid)
      .then(setChiTiet)
      .catch((err) =>
        setError(err?.response?.data?.message || 'Không tải được chi tiết bài giảng')
      )
      .finally(() => setLoadingChiTiet(false))
  }

  // Chọn 1 môn từ danh sách gợi ý
  const chonMon = (m) => {
    setMonHocId(String(m.id))
    setMonSearch(`${m.tenMon} (${m.maTuQuan})`)
    setShowGoiY(false)
    setVersionId('')
    setChiTiet([])
  }

  // Bỏ chọn môn để tìm lại
  const boChonMon = () => {
    setMonHocId('')
    setMonSearch('')
    setShowGoiY(false)
    setVersionId('')
    setChiTiet([])
  }

  const onChonVersion = (e) => {
    const vid = e.target.value
    setVersionId(vid)
    taiChiTiet(vid)
  }

  // Cập nhật 1 dòng chi tiết sau khi upload (gắn link bài giảng)
  const capNhatDong = (chiTietId, patch) =>
    setChiTiet((rows) =>
      rows.map((r) => (r.chiTietId === chiTietId ? { ...r, ...patch } : r))
    )

  // Chuyển sang trang xem video theo mã môn + phiên bản.
  // Backend chỉ kiểm tra KEY_LOGIN_TEACHER (gửi sẵn ở header x-teacher-key), không cần đăng nhập.
  const moTrangVideo = async (maMon, version) => {
    if (!maMon) return
    setOpeningPlayer(true)
    setError('')
    try {
      const token = await baiGiangService.createCourseToken(maMon, version ?? null)
      navigate(buildCoursePlayerPath(token))
    } catch (e) {
      setError(e?.response?.data?.message || 'Không mở được trang xem bài giảng')
    } finally {
      setOpeningPlayer(false)
    }
  }

  // Mở trang xem cho môn + phiên bản đang chọn ở bộ lọc.
  const moTrangXem = () => {
    if (!monDangChon || !versionId) return
    const ver = versions.find((v) => String(v.id) === String(versionId))
    moTrangVideo(monDangChon.maTuQuan, ver?.version || null)
  }

  // Gõ "mã môn/phiên bản" (vd: AV2/v2) -> vào thẳng trang xem video.
  const xemNhanh = (e) => {
    e.preventDefault()
    const v = quickPath.trim().replace(/^\/+/, '').replace(/\/+$/, '')
    if (!v) return
    const [maMon, version] = v.split('/')
    if (!maMon) return
    moTrangVideo(maMon.trim(), version ? version.trim() : null)
  }

  // Gõ "mã bài giảng" (id tb_BaiGiang) -> xem 1 video riêng lẻ.
  const xemTheoId = (e) => {
    e.preventDefault()
    const id = quickId.trim()
    if (!id) return
    navigate(buildVideoTheoIdPath(id))
  }

  return (
    <>
      <PageHeading
        icon={BookOpen}
        title="Quản lý bài giảng"
        desc="Chọn môn học và phiên bản để xem các chương và tải video bài giảng lên."
      />

      {error && (
        <div className="mb-4 flex items-center gap-2  bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Bộ chọn môn + phiên bản */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Mã môn học
          </span>
          <div className="relative">
            <input
              type="text"
              value={monSearch}
              onChange={(e) => {
                setMonSearch(e.target.value)
                setShowGoiY(true)
                if (monHocId) {
                  setMonHocId('')
                  setVersionId('')
                  setChiTiet([])
                }
              }}
              onFocus={() => setShowGoiY(true)}
              onBlur={() => setTimeout(() => setShowGoiY(false), 150)}
              disabled={loadingMon}
              placeholder={loadingMon ? 'Đang tải...' : 'Nhập mã môn, ví dụ: 2101420'}
              className="w-full  border border-slate-300 px-3 py-2 pr-8 text-sm outline-none focus:border-[#115EA8] disabled:bg-slate-100"
            />
            {monHocId ? (
              <button
                type="button"
                onClick={boChonMon}
                title="Bỏ chọn"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            ) : (
              <Search
                size={16}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
              />
            )}
          </div>

          {showGoiY && monSearch.trim() && !monHocId && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto  border border-slate-200 bg-white shadow-lg">
              {goiYMon.length ? (
                goiYMon.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => chonMon(m)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-medium text-slate-800">{m.maTuQuan}</span>
                      <span className="text-slate-500"> — {m.tenMon}</span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-slate-400">
                  Không tìm thấy môn khớp mã.
                </li>
              )}
            </ul>
          )}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Phiên bản</span>
          <select
            value={versionId}
            onChange={onChonVersion}
            disabled={!monDangChon}
            className="w-full  border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#115EA8] disabled:bg-slate-100"
          >
            <option value="">-- Chọn phiên bản --</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.version}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Nhập nhanh "mã môn / phiên bản" -> vào thẳng trang xem video */}
      <form onSubmit={xemNhanh} className="mt-4">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Xem nhanh video theo mã môn / phiên bản
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickPath}
            onChange={(e) => setQuickPath(e.target.value)}
            placeholder="Ví dụ: AV2/v2"
            className="min-w-0 flex-1  border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#115EA8] sm:max-w-md"
          />
          <button
            type="submit"
            disabled={openingPlayer || !quickPath.trim()}
            className="inline-flex shrink-0 items-center gap-1.5  bg-[#115EA8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d4a82] disabled:opacity-60"
          >
            {openingPlayer ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <PlayCircle size={16} />
            )}
            Xem video
          </button>
        </div>
      </form>

      {/* Nhập nhanh "mã bài giảng" (id tb_BaiGiang) -> xem 1 video riêng lẻ */}
      <form onSubmit={xemTheoId} className="mt-4">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Xem nhanh video theo mã bài giảng
        </span>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            value={quickId}
            onChange={(e) => setQuickId(e.target.value)}
            placeholder="Ví dụ: 1002 (local) triển khai: 13, 23..."
            className="min-w-0 flex-1  border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#115EA8] sm:max-w-md"
          />
          <button
            type="submit"
            disabled={!quickId.trim()}
            className="inline-flex shrink-0 items-center gap-1.5  bg-[#115EA8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d4a82] disabled:opacity-60"
          >
            <PlayCircle size={16} />
            Xem video
          </button>
        </div>
      </form>

      {/* Danh sách chương + upload */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-slate-800">
            <Layers size={18} /> Chương / Bài giảng
          </h2>
          {versionId ? (
            <button
              type="button"
              onClick={moTrangXem}
              disabled={openingPlayer}
              className="inline-flex items-center gap-1.5  border border-[#115EA8] px-3 py-1.5 text-sm font-medium text-[#115EA8] transition hover:bg-[#115EA8] hover:text-white disabled:opacity-60"
            >
              {openingPlayer ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <ExternalLink size={16} />
              )}
              Mở trang xem bài giảng
            </button>
          ) : null}
        </div>

        {loadingChiTiet ? (
          <p className="flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={16} /> Đang tải...
          </p>
        ) : !versionId ? (
          <p className="text-slate-500">Hãy chọn phiên bản môn học.</p>
        ) : !chiTiet.length ? (
          <p className="text-slate-500">Phiên bản này chưa có chương đăng ký nào.</p>
        ) : (
          <div className="space-y-3">
            {chiTiet.map((row) => (
              <ChuongItem
                key={row.chiTietId}
                row={row}
                onUploaded={(patch) => capNhatDong(row.chiTietId, patch)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// Một chương: hiển thị tên, link bài giảng (nếu có) và ô upload video
function ChuongItem({ row, onUploaded }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Xem trước qua proxy backend (bucket private) - lấy token rồi phát HLS
  const [preview, setPreview] = useState(false)
  const [previewSrc, setPreviewSrc] = useState(null)

  const xemTruoc = async () => {
    if (preview) {
      setPreview(false)
      return
    }
    try {
      let src = previewSrc
      if (!src && row.baiGiangId) {
        src = await baiGiangService.getPlaybackToken(row.baiGiangId)
        setPreviewSrc(src)
      }
      if (src) setPreview(true)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Không phát được video')
    }
  }

  const upload = async () => {
    if (!file) return
    setUploading(true)
    setMsg('')
    setErr('')
    try {
      // Đảm bảo có baiGiangId (tạo nếu chương chưa có bài giảng)
      let baiGiangId = row.baiGiangId
      if (!baiGiangId) {
        baiGiangId = await baiGiangService.ensureBaiGiang(row.chiTietId)
      }

      const data = await baiGiangService.uploadVideo(baiGiangId, file)

      onUploaded({
        baiGiangId,
        coVideo: data.coVideo ?? true,
        coHls: data.coHls ?? false,
      })
      setPreviewSrc(null) // buộc lấy lại token/playlist lần xem trước kế tiếp
      setMsg(data.message || 'Upload thành công')
      setFile(null)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className=" border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-800">{row.NoiDungChuong}</p>
          {row.GhiChu && <p className="mt-0.5 text-xs text-slate-400">{row.GhiChu}</p>}

          {row.coVideo ? (
            <button
              type="button"
              onClick={xemTruoc}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#115EA8] hover:underline"
            >
              <PlayCircle size={16} /> {preview ? 'Ẩn xem trước' : 'Xem trước'}
            </button>
          ) : (
            <p className="mt-2 text-xs text-amber-600">Chưa có video</p>
          )}
          {preview && previewSrc && (
            <div className="mt-2 aspect-video w-full max-w-md overflow-hidden  bg-black">
              <HlsPlayer src={previewSrc} className="h-full w-full" />
            </div>
          )}
        </div>

        {/* Upload */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="max-w-[200px] text-sm file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm"
          />
          <button
            type="button"
            onClick={upload}
            disabled={!file || uploading}
            className="flex items-center gap-1.5  bg-[#115EA8] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#0d4a82] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            {uploading ? 'Đang tải...' : 'Tải lên'}
          </button>
        </div>
      </div>

      {msg && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-[#115EA8]">
          <CheckCircle2 size={15} /> {msg}
        </p>
      )}
      {err && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle size={15} /> {err}
        </p>
      )}
    </div>
  )
}
