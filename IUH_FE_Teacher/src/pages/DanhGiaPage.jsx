import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Search,
  Star,
  Eye,
  RefreshCw,
  PlayCircle,
  BookOpen,
  DownloadCloud,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import { danhGiaService } from '../services'

/**
 * Trang "Quản lý đánh giá": mỗi PHIÊN BẢN MÔN HỌC (tb_monhoc_version) là 1 dòng,
 * kèm mã tự quản, số video, tổng lượt xem và điểm sao trung bình của bài giảng
 * thuộc phiên bản đó.
 */
export default function DanhGiaPage() {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [lanTai, setLanTai] = useState(0)
  const [tuKhoa, setTuKhoa] = useState('')
  const [chiCoBaiGiang, setChiCoBaiGiang] = useState(true)
  const [dangTai, setDangTai] = useState(null) // versionId đang xuất Excel
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let alive = true
    danhGiaService
      .getTongQuan()
      .then((items) => alive && setState({ loading: false, items, error: '' }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            items: [],
            error: e?.response?.data?.message || 'Không tải được thống kê đánh giá',
          })
      )
    return () => {
      alive = false
    }
  }, [lanTai])

  const dongHienThi = useMemo(() => {
    const q = tuKhoa.trim().toLowerCase()
    return state.items.filter((r) => {
      if (chiCoBaiGiang && !r.soBaiGiang) return false
      if (!q) return true
      return (
        (r.maTuQuan || '').toLowerCase().includes(q) ||
        (r.tenMon || '').toLowerCase().includes(q)
      )
    })
  }, [state.items, tuKhoa, chiCoBaiGiang])

  // Số liệu tổng: tính trên các dòng đang hiển thị để khớp với những gì thấy trong bảng.
  const tongVideo = dongHienThi.reduce((s, r) => s + r.soVideo, 0)
  const tongLuotXem = dongHienThi.reduce((s, r) => s + r.tongLuotXem, 0)
  const tongDanhGia = dongHienThi.reduce((s, r) => s + r.soDanhGia, 0)
  const saoChung = tongDanhGia
    ? dongHienThi.reduce((s, r) => s + r.saoTrungBinh * r.soDanhGia, 0) / tongDanhGia
    : 0

  const taiExcel = async (row) => {
    setMsg('')
    setDangTai(row.versionId)
    try {
      const soDong = await danhGiaService.xuatExcelBinhLuan(row)
      setMsg(
        soDong
          ? `Đã tải ${soDong} bình luận của ${row.maTuQuan} v${row.version}`
          : `${row.maTuQuan} v${row.version} chưa có bình luận nào để tải`
      )
    } catch (e) {
      setState((s) => ({
        ...s,
        error: e?.response?.data?.message || 'Không tải được file bình luận',
      }))
    } finally {
      setDangTai(null)
    }
  }

  const columns = [
    {
      key: 'taiVe',
      label: 'Bình luận',
      align: 'center',
      render: (r) => (
        <button
          type="button"
          onClick={() => taiExcel(r)}
          // Không có đánh giá nào -> không có gì để xuất
          disabled={!r.soDanhGia || dangTai === r.versionId}
          title={
            r.soDanhGia
              ? `Tải Excel ${r.soDanhGia} bình luận`
              : 'Chưa có bình luận nào'
          }
          aria-label="Tải Excel danh sách bình luận"
          className="rounded p-1 text-[#115EA8] transition hover:bg-[#115EA8]/10 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          {dangTai === r.versionId ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <DownloadCloud size={16} />
          )}
        </button>
      ),
    },
    {
      key: 'maTuQuan',
      label: 'Mã môn học',
      render: (r) =>
        r.maTuQuan ? (
          <span className="font-semibold text-[#115EA8]">{r.maTuQuan}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    { key: 'tenMon', label: 'Tên môn học', render: (r) => r.tenMon ?? '—' },
    {
      key: 'version',
      label: 'Phiên bản',
      align: 'center',
      render: (r) => (
        <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
          v{r.version}
        </span>
      ),
    },
    {
      key: 'soVideo',
      label: 'Video',
      align: 'center',
      // Chương chưa upload video -> hiện "2/3" để thấy ngay còn thiếu
      render: (r) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
            r.soVideo === r.soBaiGiang
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {r.soVideo}/{r.soBaiGiang}
        </span>
      ),
    },
    {
      key: 'tongLuotXem',
      label: 'Lượt xem',
      align: 'center',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-slate-600">
          <Eye size={13} className="text-slate-400" />
          {r.tongLuotXem.toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      key: 'saoTrungBinh',
      label: 'Đánh giá',
      align: 'center',
      render: (r) =>
        r.soDanhGia ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Sao diem={r.saoTrungBinh} />
            <b className="text-slate-700">{r.saoTrungBinh.toFixed(1)}</b>
            <span className="text-xs text-slate-400">({r.soDanhGia})</span>
          </span>
        ) : (
          <span className="text-xs text-slate-300">Chưa có</span>
        ),
    },
  ]

  return (
    <>
      <PageHeading
        icon={Star}
        title="Quản lý đánh giá"
        desc="Video, lượt xem và điểm đánh giá theo từng phiên bản môn học"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TheSoLieu icon={BookOpen} nhan="Phiên bản môn" so={dongHienThi.length} mau="bg-[#115EA8]" />
        <TheSoLieu icon={PlayCircle} nhan="Video" so={tongVideo} mau="bg-teal-600" />
        <TheSoLieu
          icon={Eye}
          nhan="Tổng lượt xem"
          so={tongLuotXem.toLocaleString('vi-VN')}
          mau="bg-violet-600"
        />
        <TheSoLieu
          icon={Star}
          nhan={`Sao trung bình (${tongDanhGia} đánh giá)`}
          so={saoChung ? saoChung.toFixed(1) : '—'}
          mau="bg-amber-500"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-[#115EA8] focus-within:ring-2 focus-within:ring-[#115EA8]/20 sm:max-w-md">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo mã môn hoặc tên môn"
            className="min-w-0 flex-1 text-sm outline-none"
          />
        </div>

        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={chiCoBaiGiang}
            onChange={(e) => setChiCoBaiGiang(e.target.checked)}
            className="accent-[#115EA8]"
          />
          Chỉ môn đã có bài giảng
        </label>

        <button
          type="button"
          onClick={() => setLanTai((n) => n + 1)}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          <RefreshCw size={15} /> Tải lại
        </button>
      </div>

      {msg && (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-[#115EA8]">
          <CheckCircle2 size={15} /> {msg}
        </p>
      )}
      {state.error && (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle size={15} /> {state.error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={dongHienThi}
        rowKey={(r) => r.versionId}
        loading={state.loading}
        empty={
          tuKhoa ? 'Không có môn nào khớp từ khóa' : 'Chưa có phiên bản môn nào có bài giảng'
        }
      />
    </>
  )
}

// 5 ngôi sao, tô vàng theo điểm trung bình (làm tròn nửa sao xuống).
function Sao({ diem }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={
            i <= Math.round(diem) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
          }
        />
      ))}
    </span>
  )
}

// Thẻ số liệu nhanh trên đầu trang.
function TheSoLieu({ icon: Icon, nhan, so, mau }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${mau}`}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl leading-tight font-bold text-slate-800">{so}</span>
        <span className="block truncate text-xs text-slate-400">{nhan}</span>
      </span>
    </div>
  )
}
