import { useState } from 'react'
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react'
import { PageHeading } from '../components/QuanLyLayout'
import { hocPhanMonHocService } from '../services'

// Trang "Import Học phần – Môn học": đọc file Excel (cột "Mã môn học" + "Mã lớp học phần")
// ở FE (SheetJS) rồi gửi mảng { MaMon, MaHocPhan } lên backend.
export default function ImportPage() {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const reset = () => {
    setRows([])
    setFileName('')
    setMsg('')
    setErr('')
  }

  const chonFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // cho phép chọn lại cùng một file
    if (!file) return
    setErr('')
    setMsg('')
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
    setMsg('')
    try {
      const res = await hocPhanMonHocService.importRows(rows)
      setMsg(
        `Đã thêm ${res.added} dòng mới, bỏ qua ${res.skipped} dòng trùng (tổng ${res.total}).`
      )
      setRows([])
      setFileName('')
    } catch (e) {
      setErr(e?.response?.data?.message || 'Import thất bại')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <PageHeading
        icon={FileSpreadsheet}
        title="Import Học phần – Môn học"
        desc="Nạp ánh xạ học phần ↔ môn học từ file Excel."
      />

      <div className=" border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">
          File Excel cần 2 cột: <b>Mã môn học</b> và <b>Mã lớp học phần</b>.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5  border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            {parsing ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
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
                className="inline-flex items-center gap-1.5  bg-[#115EA8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d4a82] disabled:opacity-60"
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
                className="inline-flex items-center gap-1.5  border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
              >
                <Trash2 size={16} /> Hủy
              </button>
            </>
          )}
        </div>

        {rows.length > 0 && (
          <div className="mt-3 max-h-96 overflow-auto  border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
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
    </>
  )
}
