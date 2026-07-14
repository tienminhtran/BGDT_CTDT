import { useEffect, useMemo, useState } from 'react'
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Search,
  RefreshCw,
  BookOpen,
  Layers,
} from 'lucide-react'
import PageHeading from '../components/PageHeading'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { hocPhanMonHocService } from '../services'

/**
 * Trang "Học phần – Môn học":
 *   - Bảng chính: toàn bộ ánh xạ đã import (tb_HocPhanMonHoc) kèm TÊN môn (tb_monhoc)
 *   - Nút "Import Excel": mở modal chứa luồng đọc file .xlsx và đẩy lên backend
 */
export default function ImportPage() {
  const [state, setState] = useState({ loading: true, items: [], error: '' })
  const [lanTai, setLanTai] = useState(0)
  const [tuKhoa, setTuKhoa] = useState('')
  const [msg, setMsg] = useState('')
  const [moModal, setMoModal] = useState(false)

  useEffect(() => {
    let alive = true
    hocPhanMonHocService
      .list()
      .then((items) => alive && setState({ loading: false, items, error: '' }))
      .catch(
        (e) =>
          alive &&
          setState({
            loading: false,
            items: [],
            error: e?.response?.data?.message || 'Không tải được danh sách ánh xạ',
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
      (r) =>
        r.maHocPhan.toLowerCase().includes(q) ||
        r.maMon.toLowerCase().includes(q) ||
        (r.tenMon || '').toLowerCase().includes(q)
    )
  }, [state.items, tuKhoa])

  const soMon = new Set(state.items.map((r) => r.maMon)).size
  const soHocPhan = new Set(state.items.map((r) => r.maHocPhan)).size

  const xoa = async (row) => {
    if (!window.confirm(`Xóa ánh xạ ${row.maHocPhan} → ${row.maMon}?`)) return
    setMsg('')
    try {
      await hocPhanMonHocService.remove(row.id)
      setMsg('Đã xóa 1 dòng ánh xạ')
      taiLai()
    } catch (e) {
      setState((s) => ({ ...s, error: e?.response?.data?.message || 'Xóa thất bại' }))
    }
  }

  const columns = [
    {
      key: 'maHocPhan',
      label: 'Mã lớp học phần',
      render: (r) => <span className="font-semibold text-[#115EA8]">{r.maHocPhan}</span>,
    },
    { key: 'maMon', label: 'Mã môn học' },
    {
      key: 'tenMon',
      label: 'Tên môn học',
      render: (r) =>
        r.tenMon ?? (
          // Mã môn có trong ánh xạ nhưng không có trong tb_monhoc -> import sai mã / thiếu môn
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
            <AlertTriangle size={12} /> Không có trong tb_monhoc
          </span>
        ),
    },
    {
      key: 'versions',
      label: 'Phiên bản',
      align: 'center',
      render: (r) =>
        r.versions.length ? (
          <span className="inline-block min-w-7 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
            {r.versions.length}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeading
        icon={FileSpreadsheet}
        title="Học phần – Môn học"
        desc="Ánh xạ lớp học phần ↔ môn học đã import"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TheSoLieu icon={Layers} nhan="Dòng ánh xạ" so={state.items.length} mau="bg-[#115EA8]" />
        <TheSoLieu icon={FileSpreadsheet} nhan="Lớp học phần" so={soHocPhan} mau="bg-teal-600" />
        <TheSoLieu icon={BookOpen} nhan="Môn học" so={soMon} mau="bg-violet-600" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm transition focus-within:border-[#115EA8] focus-within:ring-2 focus-within:ring-[#115EA8]/20 sm:max-w-md">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm theo mã học phần, mã môn, tên môn"
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

        <button
          type="button"
          onClick={() => setMoModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#115EA8] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4a82]"
        >
          <Upload size={15} /> Import Excel
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
        rowKey={(r) => r.id}
        actions={(r) => [{ label: 'Xóa', icon: Trash2, danger: true, onClick: () => xoa(r) }]}
        renderExpanded={(r) => <ChiTietMon row={r} />}
        loading={state.loading}
        empty={tuKhoa ? 'Không có dòng nào khớp từ khóa' : 'Chưa import ánh xạ nào'}
      />

      <ModalImport
        open={moModal}
        onClose={() => setMoModal(false)}
        onXong={(ketQua) => {
          setMoModal(false)
          setMsg(ketQua)
          taiLai() // import xong -> nạp lại bảng để thấy dòng mới
        }}
      />
    </>
  )
}

/**
 * Nội dung khi bung 1 dòng: các phiên bản của môn học (tb_monhoc_version).
 * Trình bày như panel chi tiết trong grid ASP.NET: có tiêu đề tab + bảng con.
 */
function ChiTietMon({ row }) {
  return (
    <div className="rounded border border-amber-200 bg-white">
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-100/60 px-3 py-1.5 text-sm font-medium text-slate-700">
        <Layers size={14} className="text-[#115EA8]" />
        Phiên bản môn học
        <span className="rounded-full bg-[#115EA8]/10 px-2 py-0.5 text-xs font-semibold text-[#115EA8]">
          {row.versions.length}
        </span>
      </div>

      {!row.versions.length ? (
        <p className="px-3 py-6 text-center text-sm text-slate-400">
          Môn này chưa có phiên bản nào trong tb_monhoc_version
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="w-14 px-3 py-2 text-center font-semibold">STT</th>
              <th className="px-3 py-2 font-semibold">Phiên bản</th>
              <th className="px-3 py-2 font-semibold">Mã phiên bản</th>
              <th className="px-3 py-2 font-semibold">Môn học</th>
            </tr>
          </thead>
          <tbody>
            {row.versions.map((v, i) => (
              <tr key={v.id} className="border-t border-slate-100">
                <td className="px-3 py-1.5 text-center text-xs text-slate-400">{i + 1}</td>
                <td className="px-3 py-1.5">
                  <span className="rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                    v{v.version}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-slate-500">{v.id}</td>
                <td className="px-3 py-1.5 text-slate-700">{row.tenMon}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Modal import: đọc file Excel ở FE (SheetJS) rồi gửi mảng { MaMon, MaHocPhan } lên backend.
function ModalImport({ open, onClose, onXong }) {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [err, setErr] = useState('')

  const reset = () => {
    setRows([])
    setFileName('')
    setErr('')
  }

  const chonFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng một file
    if (!file) return
    setErr('')
    setRows([])
    setFileName(file.name)
    setParsing(true)
    try {
      const parsed = await hocPhanMonHocService.parseExcel(file)
      if (!parsed.length) {
        setErr('Không đọc được dòng nào. File cần có cột "Mã môn học" và "Mã lớp học phần".')
      }
      setRows(parsed)
    } catch {
      setErr('File không hợp lệ. Hãy chọn file Excel (.xlsx / .xls).')
    } finally {
      setParsing(false)
    }
  }

  const doImport = async () => {
    if (!rows.length) return
    setImporting(true)
    setErr('')
    try {
      const res = await hocPhanMonHocService.importRows(rows)
      reset()
      onXong(
        `Đã thêm ${res.added} dòng mới, bỏ qua ${res.skipped} dòng trùng (tổng ${res.total}).`
      )
    } catch (e) {
      setErr(e?.response?.data?.message || 'Import thất bại')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import Học phần – Môn học"
      icon={FileSpreadsheet}
    >
      <p className="text-sm text-slate-500">
        File Excel cần 2 cột: <b>Mã môn học</b> và <b>Mã lớp học phần</b>.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          {parsing ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
          Chọn file Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={chonFile}
            disabled={parsing || importing}
            className="hidden"
          />
        </label>

        {fileName && (
          <span className="text-sm text-slate-500">
            {fileName}
            {rows.length > 0 && ` — ${rows.length} dòng hợp lệ`}
          </span>
        )}

        {rows.length > 0 && (
          <>
            <button
              type="button"
              onClick={doImport}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#115EA8] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4a82] disabled:opacity-60"
            >
              {importing ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Import {rows.length} dòng
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Trash2 size={16} /> Hủy
            </button>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Mã môn học</th>
                <th className="px-3 py-2 font-medium">Mã lớp học phần</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.MaHocPhan}-${r.MaMon}-${i}`} className="border-t border-slate-100">
                  <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-1.5 text-slate-700">{r.MaMon}</td>
                  <td className="px-3 py-1.5 text-slate-700">{r.MaHocPhan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {err && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle size={15} /> {err}
        </p>
      )}
    </Modal>
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
