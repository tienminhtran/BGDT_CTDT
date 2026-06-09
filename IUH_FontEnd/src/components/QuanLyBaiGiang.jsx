import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Layers,
  Upload,
  Loader2,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
} from 'lucide-react'
import Layout from './Layout'
import HlsPlayer from './HlsPlayer'
import http from '../api/http'

export default function QuanLyBaiGiang({ user, onLogout }) {
  const [monHoc, setMonHoc] = useState([])
  const [loadingMon, setLoadingMon] = useState(true)
  const [error, setError] = useState('')

  const [monHocId, setMonHocId] = useState('')
  const [versionId, setVersionId] = useState('')

  const [chiTiet, setChiTiet] = useState([])
  const [loadingChiTiet, setLoadingChiTiet] = useState(false)

  // 1) Lấy danh sách môn học + phiên bản
  useEffect(() => {
    http
      .get('/monhoc')
      .then((res) => setMonHoc(res.data.monHoc || []))
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

  // 2) Khi chọn phiên bản -> lấy chi tiết đăng ký bài giảng (các chương)
  const taiChiTiet = (vid) => {
    if (!vid) {
      setChiTiet([])
      return
    }
    setLoadingChiTiet(true)
    http
      .get('/baigiang/chi-tiet', { params: { monHocVersionId: vid } })
      .then((res) => setChiTiet(res.data.chiTiet || []))
      .catch((err) =>
        setError(err?.response?.data?.message || 'Không tải được chi tiết bài giảng')
      )
      .finally(() => setLoadingChiTiet(false))
  }

  const onChonMon = (e) => {
    const id = e.target.value
    setMonHocId(id)
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

  return (
    <Layout user={user} onLogout={onLogout}>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-green-700">
          <BookOpen size={22} /> Quản lý bài giảng
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Chọn môn học và phiên bản để xem các chương và tải video bài giảng lên.
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        {/* Bộ chọn môn + phiên bản */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Môn học</span>
            <select
              value={monHocId}
              onChange={onChonMon}
              disabled={loadingMon}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              <option value="">
                {loadingMon ? 'Đang tải...' : '-- Chọn môn học --'}
              </option>
              {monHoc.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.tenMon} ({m.maTuQuan})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Phiên bản</span>
            <select
              value={versionId}
              onChange={onChonVersion}
              disabled={!monDangChon}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500 disabled:bg-slate-100"
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

        {/* Danh sách chương + upload */}
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
            <Layers size={18} /> Chương / Bài giảng
          </h2>

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
      </main>
    </Layout>
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
        const res = await http.get(`/baigiang/${row.baiGiangId}/playback-token`)
        src = res.data.url
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
        const res = await http.post(`/baigiang/chi-tiet/${row.chiTietId}/ensure`)
        baiGiangId = res.data.baiGiangId
      }

      const form = new FormData()
      form.append('video', file)
      const res = await http.post(`/baigiang/${baiGiangId}/upload-video`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      onUploaded({
        baiGiangId,
        coVideo: res.data.coVideo ?? true,
        coHls: res.data.coHls ?? false,
      })
      setPreviewSrc(null) // buộc lấy lại token/playlist lần xem trước kế tiếp
      setMsg(res.data.message || 'Upload thành công')
      setFile(null)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Upload thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-800">{row.NoiDungChuong}</p>
          {row.GhiChu && <p className="mt-0.5 text-xs text-slate-400">{row.GhiChu}</p>}

          {row.coVideo ? (
            <button
              type="button"
              onClick={xemTruoc}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-green-700 hover:underline"
            >
              <PlayCircle size={16} /> {preview ? 'Ẩn xem trước' : 'Xem trước'}
            </button>
          ) : (
            <p className="mt-2 text-xs text-amber-600">Chưa có video</p>
          )}
          {preview && previewSrc && (
            <div className="mt-2 aspect-video w-full max-w-md overflow-hidden rounded-md bg-black">
              <HlsPlayer src={previewSrc} className="h-full w-full" />
            </div>
          )}
        </div>

        {/* Upload */}
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        <p className="mt-2 flex items-center gap-1.5 text-sm text-green-700">
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
