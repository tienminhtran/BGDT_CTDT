import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ScrollText,
  Search,
  RefreshCw,
  Upload,
  Trash2,
  Pencil,
  History,
  User,
  Globe,
} from 'lucide-react'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import { lichSuService } from '../services'

/**
 * Trang "Lịch sử bài giảng": nhật ký thao tác trên bài giảng
 * (tb_LichSuThayDoiBaiGiang) — ai upload/xóa video, lúc nào, lý do và từ IP nào.
 *
 * Backend tự ghi khi upload/xóa video thành công; trang này chỉ đọc. Tải 1 lần
 * (mặc định 500 dòng mới nhất) rồi lọc/phân trang phía client như các màn quản lý khác.
 */

// Nhãn + màu cho từng hành động (khớp cột NgayTao/NgaySua/NgayXoa ở backend).
const HANH_DONG = {
  tao: { nhan: 'Tạo / Upload', icon: Upload, lop: 'bg-emerald-100 text-emerald-700' },
  sua: { nhan: 'Sửa', icon: Pencil, lop: 'bg-amber-100 text-amber-700' },
  xoa: { nhan: 'Xóa video', icon: Trash2, lop: 'bg-red-100 text-red-700' },
}

// dd/mm/yyyy hh:mm — giờ địa phương, không hiện chuỗi ISO thô.
const dinhDangGio = (t) => {
  if (!t) return '—'
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return '—'
  const hai = (n) => String(n).padStart(2, '0')
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`
}

export default function LichSuBaiGiangPage() {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [lanTai, setLanTai] = useState(0)
  const [tuKhoa, setTuKhoa] = useState('')
  const [loc, setLoc] = useState('') // '' = mọi hành động
  const [tuNgay, setTuNgay] = useState('')
  const [denNgay, setDenNgay] = useState('')

  useEffect(() => {
    let alive = true
    lichSuService
      .getTatCa()
      .then((items) => alive && setState({ loading: false, items, error: '' }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            items: [],
            error: e?.response?.data?.message || 'Không tải được nhật ký bài giảng',
          })
      )
    return () => {
      alive = false
    }
  }, [lanTai])

  const dongHienThi = useMemo(() => {
    const q = tuKhoa.trim().toLowerCase()
    // Ngày lọc bao trọn ngày được chọn (00:00 -> 23:59:59.999).
    const tu = tuNgay ? new Date(`${tuNgay}T00:00:00`).getTime() : null
    const den = denNgay ? new Date(`${denNgay}T23:59:59.999`).getTime() : null

    return state.items.filter((r) => {
      if (loc && r.hanhDong !== loc) return false

      if (tu != null || den != null) {
        const t = r.thoiGian ? new Date(r.thoiGian).getTime() : NaN
        if (Number.isNaN(t)) return false
        if (tu != null && t < tu) return false
        if (den != null && t > den) return false
      }

      if (!q) return true
      return [r.maNguoi, r.maTuQuan, r.tenMon, r.tenBaiGiang, r.noiDungChuong, r.diaChiIP, r.lyDo]
        .some((v) => String(v ?? '').toLowerCase().includes(q))
    })
  }, [state.items, tuKhoa, loc, tuNgay, denNgay])

  // Số liệu tính trên các dòng đang hiển thị để khớp những gì thấy trong bảng.
  const soTao = dongHienThi.filter((r) => r.hanhDong === 'tao').length
  const soXoa = dongHienThi.filter((r) => r.hanhDong === 'xoa').length
  const soNguoi = new Set(dongHienThi.map((r) => r.maNguoi).filter(Boolean)).size

  const columns = [
    {
      key: 'thoiGian',
      label: 'Thời gian',
      printValue: (r) => dinhDangGio(r.thoiGian),
      render: (r) => <span className="whitespace-nowrap text-slate-600">{dinhDangGio(r.thoiGian)}</span>,
    },
    {
      key: 'hanhDong',
      label: 'Thao tác',
      align: 'center',
      printValue: (r) => HANH_DONG[r.hanhDong]?.nhan || '—',
      render: (r) => <TheHanhDong hanhDong={r.hanhDong} />,
    },
    {
      key: 'maNguoi',
      label: 'Người thao tác',
      printValue: (r) => r.maNguoi || '',
      render: (r) =>
        r.maNguoi ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <User size={13} className="text-slate-400" />
            {r.maNguoi}
          </span>
        ) : (
          <span className="text-xs text-slate-300">Không rõ</span>
        ),
    },
    {
      key: 'maTuQuan',
      label: 'Mã môn',
      printValue: (r) => r.maTuQuan || '',
      render: (r) =>
        r.maTuQuan ? (
          <span className="font-semibold text-[#115EA8]">{r.maTuQuan}</span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    { key: 'tenMon', label: 'Tên môn học', printValue: (r) => r.tenMon || '', render: (r) => r.tenMon ?? '—' },
    {
      key: 'version',
      label: 'Phiên bản',
      align: 'center',
      printValue: (r) => (r.version ? `v${r.version}` : ''),
      render: (r) =>
        r.version ? (
          <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
            v{r.version}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'tenBaiGiang',
      label: 'Bài giảng',
      printValue: (r) => r.tenBaiGiang || r.noiDungChuong || '',
      // Bài giảng đã bị xóa hẳn -> không còn tên, vẫn giữ dòng nhật ký kèm id để tra cứu.
      render: (r) => (
        <span className="text-slate-700">
          {r.tenBaiGiang || r.noiDungChuong || (
            <span className="text-xs text-slate-400">#{r.idBaiGiang ?? '—'} (đã xóa)</span>
          )}
        </span>
      ),
    },
    {
      key: 'lyDo',
      label: 'Lý do',
      printValue: (r) => r.lyDo || '',
      render: (r) =>
        r.lyDo ? (
          <span className="text-slate-600" title={r.lyDo}>
            {r.lyDo}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'diaChiIP',
      label: 'Địa chỉ IP',
      printValue: (r) => r.diaChiIP || '',
      render: (r) =>
        r.diaChiIP ? (
          <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-xs text-slate-500">
            <Globe size={12} className="text-slate-400" />
            {r.diaChiIP}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeading
        icon={ScrollText}
        title="Lịch sử bài giảng"
        desc="Nhật ký upload / xóa video bài giảng: ai thao tác, khi nào, lý do và từ IP nào"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <TheSoLieu icon={History} nhan="Lượt thao tác" so={dongHienThi.length} mau="bg-[#115EA8]" />
        <TheSoLieu icon={Upload} nhan="Tạo / Upload" so={soTao} mau="bg-emerald-600" />
        <TheSoLieu icon={Trash2} nhan="Xóa video" so={soXoa} mau="bg-red-500" />
        <TheSoLieu icon={User} nhan="Người thao tác" so={soNguoi} mau="bg-violet-600" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-[#115EA8] focus-within:ring-2 focus-within:ring-[#115EA8]/20 sm:max-w-md">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo mã người, mã môn, tên môn, bài giảng, IP…"
            className="min-w-0 flex-1 text-sm outline-none"
          />
        </div>

        <select
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          aria-label="Lọc theo thao tác"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#115EA8]"
        >
          <option value="">Mọi thao tác</option>
          <option value="tao">Tạo / Upload</option>
          <option value="sua">Sửa</option>
          <option value="xoa">Xóa video</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          Từ
          <input
            type="date"
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-[#115EA8]"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          đến
          <input
            type="date"
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none transition focus:border-[#115EA8]"
          />
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
        rowKey={(r) => r.id}
        selectable
        printTitle="Lịch sử bài giảng"
        loading={state.loading}
        empty={
          tuKhoa || loc || tuNgay || denNgay
            ? 'Không có thao tác nào khớp bộ lọc'
            : 'Chưa có thao tác nào được ghi nhận'
        }
      />
    </>
  )
}

// Nhãn màu cho thao tác; hành động lạ (dữ liệu cũ thiếu cột ngày) -> hiện dấu gạch.
function TheHanhDong({ hanhDong }) {
  const o = HANH_DONG[hanhDong]
  if (!o) return <span className="text-slate-300">—</span>
  const Icon = o.icon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${o.lop}`}
    >
      <Icon size={12} /> {o.nhan}
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
