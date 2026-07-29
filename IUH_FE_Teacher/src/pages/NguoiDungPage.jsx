import { useEffect, useMemo, useState } from 'react'
import {
  UserCog,
  UserPlus,
  Search,
  RefreshCw,
  Trash2,
  Lock,
  LockOpen,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  KeyRound,
  X,
} from 'lucide-react'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import { nguoiDungService } from '../services'
import { TRANG_THAI } from '../services/nguoiDungService'
import { useAuthStore } from '../store/authStore'

// Thẻ số liệu nhanh trên đầu trang (đồng bộ với các màn quản lý khác).
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

/** Form thêm tài khoản, hiện dạng hộp thoại giữa màn hình. */
function FormThemTaiKhoan({ onDong, onXong }) {
  const [form, setForm] = useState({ manhansu: '', hoten: '', matkhau: '' })
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState('')

  const sua = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const guiForm = async (e) => {
    e.preventDefault()
    if (dangGui) return

    setLoi('')
    setDangGui(true)
    try {
      await nguoiDungService.create({
        manhansu: form.manhansu.trim(),
        hoten: form.hoten.trim(),
        matkhau: form.matkhau,
      })
      onXong(form.manhansu.trim())
    } catch (err) {
      // Backend trả 409 khi trùng mã, 400 khi mật khẩu quá ngắn -> hiện nguyên văn.
      setLoi(err?.response?.data?.message || 'Tạo tài khoản thất bại')
      setDangGui(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={guiForm}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-[#115EA8]">
            <UserPlus size={18} /> Thêm tài khoản
          </h2>
          <button
            type="button"
            onClick={onDong}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Mã nhân sự</span>
            <input
              value={form.manhansu}
              onChange={sua('manhansu')}
              required
              autoFocus
              placeholder="VD: 04112003"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#115EA8] focus:ring-2 focus:ring-[#115EA8]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Họ tên</span>
            <input
              value={form.hoten}
              onChange={sua('hoten')}
              required
              placeholder="VD: Trần Minh Tiến"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#115EA8] focus:ring-2 focus:ring-[#115EA8]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Mật khẩu</span>
            <input
              type="password"
              value={form.matkhau}
              onChange={sua('matkhau')}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Tối thiểu 6 ký tự"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#115EA8] focus:ring-2 focus:ring-[#115EA8]/20"
            />
            <span className="mt-1 block text-xs text-slate-400">
              Mật khẩu được mã hóa trước khi lưu, không xem lại được. Quên thì phải cấp lại.
            </span>
          </label>

          {loi && (
            <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {loi}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onDong}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={dangGui}
            className="flex items-center gap-1.5 rounded-lg bg-[#115EA8] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4a82] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dangGui ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            {dangGui ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Hộp thoại cấp lại mật khẩu cho 1 tài khoản.
 *
 * Có ô nhập lại vì mật khẩu chỉ lưu dạng băm - gõ nhầm thì không ai đọc lại được
 * để biết đã đặt thành gì, chỉ còn cách cấp lại lần nữa.
 */
function FormDatLaiMatKhau({ nguoiDung, onDong, onXong }) {
  const [matkhau, setMatkhau] = useState('')
  const [nhapLai, setNhapLai] = useState('')
  const [dangGui, setDangGui] = useState(false)
  const [loi, setLoi] = useState('')

  const guiForm = async (e) => {
    e.preventDefault()
    if (dangGui) return

    if (matkhau !== nhapLai) {
      setLoi('Hai lần nhập mật khẩu không khớp')
      return
    }

    setLoi('')
    setDangGui(true)
    try {
      await nguoiDungService.datLaiMatKhau(nguoiDung.Manhansu, matkhau)
      onXong(nguoiDung.Manhansu)
    } catch (err) {
      setLoi(err?.response?.data?.message || 'Đặt lại mật khẩu thất bại')
      setDangGui(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={guiForm}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-[#115EA8]">
            <KeyRound size={18} /> Đặt lại mật khẩu
          </h2>
          <button
            type="button"
            onClick={onDong}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Tài khoản{' '}
            <span className="font-semibold text-[#115EA8]">{nguoiDung.Manhansu}</span> —{' '}
            {nguoiDung.hoten}
          </p>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Mật khẩu mới</span>
            <input
              type="password"
              value={matkhau}
              onChange={(e) => setMatkhau(e.target.value)}
              required
              minLength={6}
              autoFocus
              autoComplete="new-password"
              placeholder="Tối thiểu 6 ký tự"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#115EA8] focus:ring-2 focus:ring-[#115EA8]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Nhập lại mật khẩu</span>
            <input
              type="password"
              value={nhapLai}
              onChange={(e) => setNhapLai(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Gõ lại mật khẩu mới"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#115EA8] focus:ring-2 focus:ring-[#115EA8]/20"
            />
          </label>

          <p className="text-xs text-slate-400">
            Nhớ báo mật khẩu mới cho người dùng. Phiên đang đăng nhập của họ vẫn dùng được
            tới khi hết hạn, đổi mật khẩu không đá họ ra ngay.
          </p>

          {loi && (
            <p role="alert" className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {loi}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onDong}
            className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={dangGui}
            className="flex items-center gap-1.5 rounded-lg bg-[#115EA8] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4a82] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dangGui ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            {dangGui ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Quản lý tài khoản đăng nhập app giảng viên (bảng tb_login_bgdt):
 * xem danh sách, thêm, đặt lại mật khẩu, khóa/mở khóa, xóa.
 *
 * Backend chặn sẵn hai thao tác tự hại: tự khóa/xóa chính mình, và khóa/xóa tài
 * khoản hoạt động cuối cùng. Ở đây thêm phần làm mờ nút cho khỏi bấm nhầm.
 */
export default function NguoiDungPage() {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [lanTai, setLanTai] = useState(0)
  const [tuKhoa, setTuKhoa] = useState('')
  const [msg, setMsg] = useState('')
  const [moForm, setMoForm] = useState(false)
  // Tài khoản đang được đặt lại mật khẩu (null = không mở hộp thoại nào).
  const [datLaiMk, setDatLaiMk] = useState(null)

  // Mã của người đang đăng nhập -> đánh dấu dòng "chính bạn" và chặn tự khóa/xóa.
  const maToi = useAuthStore((s) => s.nguoiDung?.Manhansu)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    nguoiDungService
      .list()
      .then((items) => alive && setState({ loading: false, items, error: '' }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            items: [],
            error: e?.response?.data?.message || 'Không tải được danh sách tài khoản',
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
    return state.items.filter(
      (u) =>
        u.Manhansu.toLowerCase().includes(q) || (u.hoten || '').toLowerCase().includes(q)
    )
  }, [state.items, tuKhoa])

  const soHoatDong = state.items.filter((u) => u.trangthai === TRANG_THAI.HOAT_DONG).length
  const soKhoa = state.items.length - soHoatDong

  const baoLoi = (e, mac) =>
    setState((s) => ({ ...s, error: e?.response?.data?.message || mac }))

  const doiTrangThai = async (u) => {
    const khoaLai = u.trangthai === TRANG_THAI.HOAT_DONG
    if (khoaLai && !window.confirm(`Khóa tài khoản ${u.Manhansu} (${u.hoten})?`)) return

    setMsg('')
    setState((s) => ({ ...s, error: '' }))
    try {
      await nguoiDungService.doiTrangThai(
        u.Manhansu,
        khoaLai ? TRANG_THAI.KHOA : TRANG_THAI.HOAT_DONG
      )
      setMsg(`Đã ${khoaLai ? 'khóa' : 'mở khóa'} ${u.Manhansu}`)
      taiLai()
    } catch (e) {
      baoLoi(e, khoaLai ? 'Khóa tài khoản thất bại' : 'Mở khóa thất bại')
    }
  }

  const xoa = async (u) => {
    if (
      !window.confirm(
        `Xóa tài khoản ${u.Manhansu} (${u.hoten})? Thao tác không hoàn tác được — nếu chỉ muốn tạm ngưng thì dùng Khóa.`
      )
    )
      return

    setMsg('')
    setState((s) => ({ ...s, error: '' }))
    try {
      await nguoiDungService.remove(u.Manhansu)
      setMsg(`Đã xóa ${u.Manhansu}`)
      taiLai()
    } catch (e) {
      baoLoi(e, 'Xóa tài khoản thất bại')
    }
  }

  const columns = [
    {
      key: 'Manhansu',
      label: 'Mã nhân sự',
      render: (u) => (
        <span className="font-semibold tracking-wide text-[#115EA8]">
          {u.Manhansu}
          {u.Manhansu === maToi && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              bạn
            </span>
          )}
        </span>
      ),
    },
    { key: 'hoten', label: 'Họ tên' },
    {
      key: 'trangthai',
      label: 'Trạng thái',
      printValue: (u) => (u.trangthai === TRANG_THAI.HOAT_DONG ? 'Hoạt động' : 'Đã khóa'),
      render: (u) =>
        u.trangthai === TRANG_THAI.HOAT_DONG ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            <ShieldCheck size={12} /> Hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-red-700">
            <Lock size={12} /> Đã khóa
          </span>
        ),
    },
  ]

  const actions = (u) => {
    const laToi = u.Manhansu === maToi
    const dangHoatDong = u.trangthai === TRANG_THAI.HOAT_DONG
    return [
      {
        label: 'Đặt lại mật khẩu',
        icon: KeyRound,
        onClick: () => setDatLaiMk(u),
      },
      {
        label: dangHoatDong ? 'Khóa' : 'Mở khóa',
        icon: dangHoatDong ? Lock : LockOpen,
        // Tự khóa mình sẽ tự cắt luôn phiên đang thao tác -> backend cũng chặn.
        disabled: laToi && dangHoatDong,
        onClick: () => doiTrangThai(u),
      },
      {
        label: 'Xóa',
        icon: Trash2,
        danger: true,
        disabled: laToi,
        onClick: () => xoa(u),
      },
    ]
  }

  return (
    <div>
      <PageHeading
        icon={UserCog}
        title="Người dùng"
        desc="Tài khoản đăng nhập trang quản lý bài giảng điện tử"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TheSoLieu icon={UserCog} nhan="Tổng tài khoản" so={state.items.length} mau="bg-[#115EA8]" />
        <TheSoLieu icon={ShieldCheck} nhan="Đang hoạt động" so={soHoatDong} mau="bg-emerald-500" />
        <TheSoLieu icon={Lock} nhan="Đã khóa" so={soKhoa} mau="bg-red-500" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-[#115EA8] focus-within:ring-2 focus-within:ring-[#115EA8]/20 sm:max-w-md">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo mã nhân sự hoặc họ tên"
            className="min-w-0 flex-1 text-sm outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => setMoForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#115EA8] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4a82]"
        >
          <UserPlus size={15} /> Thêm tài khoản
        </button>

        <button
          type="button"
          onClick={taiLai}
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
        rowKey={(u) => u.Manhansu}
        actions={actions}
        loading={state.loading}
        empty={tuKhoa ? 'Không có tài khoản khớp từ khóa' : 'Chưa có tài khoản nào'}
      />

      {moForm && (
        <FormThemTaiKhoan
          onDong={() => setMoForm(false)}
          onXong={(ma) => {
            setMoForm(false)
            setMsg(`Đã tạo tài khoản ${ma}`)
            taiLai()
          }}
        />
      )}

      {datLaiMk && (
        <FormDatLaiMatKhau
          nguoiDung={datLaiMk}
          onDong={() => setDatLaiMk(null)}
          onXong={(ma) => {
            setDatLaiMk(null)
            setMsg(`Đã đặt lại mật khẩu cho ${ma}`)
            // Danh sách không đổi (mật khẩu không hiển thị) nên khỏi tải lại.
          }}
        />
      )}
    </div>
  )
}
