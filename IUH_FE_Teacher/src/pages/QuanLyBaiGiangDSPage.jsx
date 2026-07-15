import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Search,
  RefreshCw,
  PlayCircle,
  BookOpen,
  Layers,
  Video,
  Loader2,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import VideoModal from '../components/VideoModal'
import { danhGiaService, baiGiangService } from '../services'

/**
 * Trang "Quản lý bài giảng": danh sách PHIÊN BẢN MÔN HỌC (tb_monhoc_version),
 * bấm mũi tên để bung ra CHI TIẾT ĐĂNG KÝ (các chương) của phiên bản đó; chương
 * nào đã có video thì có nút xem nhanh (mở modal phát HLS).
 *
 * Danh sách phiên bản dùng chung số liệu với màn Quản lý đánh giá (getTongQuan).
 */
export default function QuanLyBaiGiangDSPage() {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [lanTai, setLanTai] = useState(0)
  const [tuKhoa, setTuKhoa] = useState('')
  const [chiCoBaiGiang, setChiCoBaiGiang] = useState(true)
  const [xem, setXem] = useState(null) // { baiGiangId, tieuDe } đang mở modal

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
            error: e?.response?.data?.message || 'Không tải được danh sách môn học',
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

  const tongBaiGiang = dongHienThi.reduce((s, r) => s + r.soBaiGiang, 0)
  const tongVideo = dongHienThi.reduce((s, r) => s + r.soVideo, 0)

  // Bảng con để in kèm: danh sách chương (chi tiết đăng ký) của 1 phiên bản.
  const layChiTietIn = async (row) => {
    const items = await baiGiangService.getChiTiet(row.versionId)
    if (!items.length) return null
    return {
      tieuDe: `Chi tiết đăng ký — ${row.maTuQuan || ''} · ${row.tenMon || ''} · v${row.version}`,
      cot: [
        { label: 'Nội dung chương' },
        { label: 'Tên bài giảng' },
        { label: 'Ghi chú' },
        { label: 'Video', align: 'center' },
      ],
      dong: items.map((ct) => [
        ct.NoiDungChuong,
        ct.TenBaiGiang || '',
        ct.GhiChu || '',
        ct.coHls ? 'Có video' : ct.coVideo ? 'Đang xử lý' : 'Chưa có',
      ]),
    }
  }

  const columns = [
    {
      key: 'maTuQuan',
      label: 'Mã môn học',
      printValue: (r) => r.maTuQuan || '',
      render: (r) =>
        r.maTuQuan ? (
          <span className="font-semibold text-[#115EA8]">{r.maTuQuan}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'tenMon',
      label: 'Tên môn học',
      printValue: (r) => r.tenMon || '',
      render: (r) => r.tenMon ?? '—',
    },
    {
      key: 'version',
      label: 'Phiên bản',
      align: 'center',
      printValue: (r) => `v${r.version}`,
      render: (r) => (
        <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
          v{r.version}
        </span>
      ),
    },
    {
      key: 'soBaiGiang',
      label: 'Chương',
      align: 'center',
      render: (r) => (
        <span className="inline-block min-w-7 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {r.soBaiGiang}
        </span>
      ),
    },
    {
      key: 'soVideo',
      label: 'Video',
      align: 'center',
      // "2/3" = số chương đã có video / tổng số chương
      printValue: (r) => `${r.soVideo}/${r.soBaiGiang}`,
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
      printValue: (r) => r.tongLuotXem,
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-slate-600">
          <Eye size={13} className="text-slate-400" />
          {r.tongLuotXem.toLocaleString('vi-VN')}
        </span>
      ),
    },
  ]

  return (
    <>
      <PageHeading
        icon={Video}
        title="Quản lý bài giảng"
        desc="Danh sách phiên bản môn học — mở rộng để xem chi tiết đăng ký và video từng chương"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TheSoLieu icon={BookOpen} nhan="Phiên bản môn" so={dongHienThi.length} mau="bg-[#115EA8]" />
        <TheSoLieu icon={Layers} nhan="Tổng số chương" so={tongBaiGiang} mau="bg-teal-600" />
        <TheSoLieu icon={PlayCircle} nhan="Chương có video" so={tongVideo} mau="bg-violet-600" />
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

      {state.error && (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle size={15} /> {state.error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={dongHienThi}
        rowKey={(r) => r.versionId}
        renderExpanded={(r) => <ChiTietChuong row={r} onXem={setXem} />}
        selectable
        printTitle="Danh sách bài giảng theo môn học"
        printDetail={layChiTietIn}
        loading={state.loading}
        empty={tuKhoa ? 'Không có môn nào khớp từ khóa' : 'Chưa có phiên bản môn nào có bài giảng'}
      />

      <VideoModal
        open={!!xem}
        baiGiangId={xem?.baiGiangId}
        tieuDe={xem?.tieuDe}
        onClose={() => setXem(null)}
      />
    </>
  )
}

/**
 * Nội dung khi bung 1 phiên bản: danh sách chương (chi tiết đăng ký) của phiên bản đó.
 * Chỉ gọi API khi dòng được mở (component chỉ mount lúc bung) -> không tải thừa.
 */
function ChiTietChuong({ row, onXem }) {
  const [state, setState] = useState({ loading: true, items: [], error: '' })

  useEffect(() => {
    let alive = true
    baiGiangService
      .getChiTiet(row.versionId)
      .then((items) => alive && setState({ loading: false, items, error: '' }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            items: [],
            error: e?.response?.data?.message || 'Không tải được chi tiết đăng ký',
          })
      )
    return () => {
      alive = false
    }
  }, [row.versionId])

  const { loading, items, error } = state

  return (
    <div className="rounded border border-amber-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-3 py-1.5 text-sm font-medium text-slate-700">
        <FileText size={14} className="text-[#115EA8]" />
        Chi tiết đăng ký — {row.maTuQuan} · {row.tenMon} · v{row.version}
        {!loading && (
          <span className="rounded-full bg-[#115EA8]/10 px-2 py-0.5 text-xs font-semibold text-[#115EA8]">
            {items.length} chương
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 size={15} className="animate-spin" /> Đang tải...
        </div>
      ) : error ? (
        <p className="flex items-center gap-1.5 px-3 py-6 text-sm text-red-600">
          <AlertTriangle size={14} /> {error}
        </p>
      ) : !items.length ? (
        <p className="px-3 py-6 text-center text-sm text-slate-400">
          Phiên bản này chưa có chương đăng ký nào
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="w-12 px-3 py-2 text-center font-semibold">STT</th>
              <th className="px-3 py-2 font-semibold">Nội dung chương</th>
              <th className="px-3 py-2 font-semibold">Tên bài giảng</th>
              <th className="px-3 py-2 font-semibold">Ghi chú</th>
              <th className="w-28 px-3 py-2 text-center font-semibold">Video</th>
              <th className="w-20 px-3 py-2 text-center font-semibold">Xem</th>
            </tr>
          </thead>
          <tbody>
            {items.map((ct, i) => (
              <tr key={ct.chiTietId} className="border-t border-slate-100">
                <td className="px-3 py-1.5 text-center text-xs text-slate-400">{i + 1}</td>
                <td className="px-3 py-1.5 font-medium text-slate-700">{ct.NoiDungChuong}</td>
                <td className="px-3 py-1.5 text-slate-600">{ct.TenBaiGiang || '—'}</td>
                <td className="px-3 py-1.5 text-slate-400">{ct.GhiChu || '—'}</td>
                <td className="px-3 py-1.5 text-center">
                  <TrangThaiVideo coVideo={ct.coVideo} coHls={ct.coHls} />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      onXem({
                        baiGiangId: ct.baiGiangId,
                        tieuDe: `${ct.NoiDungChuong}${ct.TenBaiGiang ? ` — ${ct.TenBaiGiang}` : ''}`,
                      })
                    }
                    // Chưa có bản HLS thì không phát được -> khóa nút
                    disabled={!ct.coHls || !ct.baiGiangId}
                    title={ct.coHls ? 'Xem video' : 'Chưa có bản phát'}
                    className="inline-flex items-center gap-1 rounded bg-[#115EA8] px-2 py-1 text-xs font-medium text-white transition hover:bg-[#0d4a82] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <PlayCircle size={13} /> Xem
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Trạng thái video của 1 chương: đã có bản phát / đang xử lý / chưa có.
function TrangThaiVideo({ coVideo, coHls }) {
  if (coHls)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 size={12} /> Có video
      </span>
    )
  if (coVideo)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        <Loader2 size={12} /> Đang xử lý
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-400">
      <XCircle size={12} /> Chưa có
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
