import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  Search,
  RefreshCw,
  Trash2,
  LockOpen,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import { sinhVienService } from '../services'

// Thẻ số liệu nhanh trên đầu trang.
function TheSoLieu({ icon: Icon, nhan, so, mau }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${mau}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-xl leading-tight font-bold text-slate-800">{so}</span>
        <span className="block truncate text-xs text-slate-400">{nhan}</span>
      </span>
    </div>
  )
}

// 185 -> "3 phút 5 giây"
const dinhDangConLai = (giay) => {
  const p = Math.floor(giay / 60)
  const g = giay % 60
  return p ? `${p} phút ${g} giây` : `${g} giây`
}

export default function ThongTinSinhVienPage() {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [lanTai, setLanTai] = useState(0) // tăng lên để tải lại danh sách
  const [tuKhoa, setTuKhoa] = useState('')
  const [msg, setMsg] = useState('')
  const [dangChon, setDangChon] = useState([]) // các dòng đang tick checkbox

  useEffect(() => {
    let alive = true
    sinhVienService
      .list()
      .then((items) => alive && setState({ loading: false, items, error: '' }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            items: [],
            error: e?.response?.data?.message || 'Không tải được danh sách sinh viên',
          })
      )
    return () => {
      alive = false
    }
  }, [lanTai])

  const taiLai = () => setLanTai((n) => n + 1)

  const dongHienThi = useMemo(() => {
    const q = tuKhoa.trim().toLowerCase()
    if (!q) return state.items
    return state.items.filter((sv) => sv.mssv.toLowerCase().includes(q))
  }, [state.items, tuKhoa])

  const soDangKhoa = state.items.filter((sv) => sv.dangKhoa).length
  const soCoLanSai = state.items.filter((sv) => sv.soLanSai > 0).length

  const moKhoa = async (sv) => {
    setMsg('')
    try {
      await sinhVienService.unlock(sv.mssv)
      setMsg(`Đã mở khóa ${sv.mssv}`)
      taiLai()
    } catch (e) {
      setState((s) => ({ ...s, error: e?.response?.data?.message || 'Mở khóa thất bại' }))
    }
  }

  const xoa = async (sv) => {
    // Xóa hết ánh xạ học phần -> SV mất quyền xem bài giảng, nên hỏi lại cho chắc.
    if (
      !window.confirm(
        `Xóa sinh viên ${sv.mssv}? Toàn bộ ${sv.soHocPhan} học phần của SV sẽ bị gỡ và SV không xem được bài giảng nữa.`
      )
    )
      return

    setMsg('')
    try {
      await sinhVienService.remove(sv.mssv)
      setMsg(`Đã xóa ${sv.mssv}`)
      taiLai()
    } catch (e) {
      setState((s) => ({ ...s, error: e?.response?.data?.message || 'Xóa thất bại' }))
    }
  }

  // Xóa nhiều SV đang tick: gọi lần lượt, xong mới tải lại 1 lần.
  const xoaDaChon = async () => {
    if (!dangChon.length) return
    if (!window.confirm(`Xóa ${dangChon.length} sinh viên đã chọn? Thao tác không hoàn tác được.`))
      return

    setMsg('')
    try {
      for (const sv of dangChon) await sinhVienService.remove(sv.mssv)
      setMsg(`Đã xóa ${dangChon.length} sinh viên`)
      taiLai()
    } catch (e) {
      setState((s) => ({ ...s, error: e?.response?.data?.message || 'Xóa thất bại' }))
    }
  }

  const columns = [
    {
      key: 'mssv',
      label: 'Mã sinh viên',
      render: (sv) => (
        <span className="font-semibold tracking-wide text-[#115EA8]">{sv.mssv}</span>
      ),
    },
    {
      key: 'soHocPhan',
      label: 'Số học phần',
      align: 'center',
      render: (sv) => (
        <span className="inline-block min-w-7 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
          {sv.soHocPhan}
        </span>
      ),
    },
    {
      key: 'soLanSai',
      label: 'Đăng nhập sai',
      align: 'center',
      render: (sv) =>
        sv.soLanSai ? (
          // Càng gần ngưỡng khóa càng đỏ
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
              sv.soLanSai >= 4
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}
          >
            {sv.soLanSai} lần
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: 'trangThai',
      label: 'Trạng thái',
      render: (sv) =>
        sv.dangKhoa ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-red-700">
            <Lock size={12} /> Đang khóa · còn {dinhDangConLai(sv.khoaConLai)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={12} /> Bình thường
          </span>
        ),
    },
  ]

  const actions = (sv) => [
    {
      label: 'Mở khóa',
      icon: LockOpen,
      disabled: !sv.dangKhoa && !sv.soLanSai,
      onClick: () => moKhoa(sv),
    },
    { label: 'Xóa', icon: Trash2, danger: true, onClick: () => xoa(sv) },
  ]

  return (
    <div>
      <PageHeading
        icon={Users}
        title="Thông tin sinh viên"
        desc="Danh sách sinh viên đã có học phần, kèm trạng thái khóa đăng nhập"
      />

      {/* Số liệu nhanh */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TheSoLieu
          icon={Users}
          nhan="Tổng sinh viên"
          so={state.items.length}
          mau="bg-[#115EA8]"
        />
        <TheSoLieu icon={Lock} nhan="Đang bị khóa" so={soDangKhoa} mau="bg-red-500" />
        <TheSoLieu
          icon={AlertTriangle}
          nhan="Có lần sai"
          so={soCoLanSai}
          mau="bg-amber-500"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-[#115EA8] focus-within:ring-2 focus-within:ring-[#115EA8]/20 sm:max-w-md">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo MSSV"
            className="min-w-0 flex-1 text-sm outline-none"
          />
        </div>

        <button
          type="button"
          onClick={taiLai}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          <RefreshCw size={15} /> Tải lại
        </button>

        {dangChon.length > 0 && (
          <button
            type="button"
            onClick={xoaDaChon}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
          >
            <Trash2 size={15} /> Xóa ({dangChon.length})
          </button>
        )}
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
        rowKey={(sv) => sv.mssv}
        actions={actions}
        selectable
        onSelectionChange={setDangChon}
        loading={state.loading}
        empty={tuKhoa ? 'Không có sinh viên khớp từ khóa' : 'Chưa có sinh viên nào'}
      />
    </div>
  )
}
