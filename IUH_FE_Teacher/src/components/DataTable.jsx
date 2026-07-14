import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
} from 'lucide-react'
import ActionMenu from './ActionMenu'

const CO_TRANG = [10, 20, 50, 100]

/**
 * Bảng dùng chung cho các màn quản lý, dựng theo kiểu grid ASP.NET của trường:
 * kẻ ô đầy đủ, cột chọn (checkbox) + STT + cột thao tác nằm bên TRÁI, chân bảng
 * có phân trang và "mẫu tin/trang".
 *
 * Component KHÔNG biết gì về dữ liệu cụ thể — trang gọi nó chỉ khai báo cột,
 * dòng và thao tác.
 *
 * @param {Array<{key, label, render?, align?, width?}>} columns
 *        render(row) -> nội dung ô; không có thì lấy row[key]
 * @param {Array<object>} rows
 * @param {(row) => string|number} rowKey        khóa duy nhất của dòng
 * @param {(row) => Array} actions               thao tác của dòng (menu ở cột trái)
 * @param {boolean} selectable                   hiện cột checkbox
 * @param {(rows) => void} onSelectionChange     báo về trang các dòng đang chọn
 * @param {(row) => React.ReactNode} renderExpanded
 *        có hàm này -> thêm cột mũi tên bên trái; bấm mũi tên thì bung 1 dòng chi
 *        tiết nằm ngay dưới, trải hết chiều ngang bảng
 * @param {boolean} loading
 * @param {string} empty
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  actions,
  selectable = false,
  onSelectionChange,
  renderExpanded,
  loading = false,
  empty = 'Không có dữ liệu',
}) {
  const [trang, setTrang] = useState(1)
  const [coTrang, setCoTrang] = useState(10)
  const [chon, setChon] = useState(() => new Set())
  const [mo, setMo] = useState(() => new Set()) // các dòng đang bung chi tiết

  const soTrang = Math.max(1, Math.ceil(rows.length / coTrang))
  // Dữ liệu co lại (lọc/xóa) làm mất trang cuối -> kẹp trang hiện tại lại.
  const trangHienTai = Math.min(trang, soTrang)

  const dongHienThi = useMemo(() => {
    const dau = (trangHienTai - 1) * coTrang
    return rows.slice(dau, dau + coTrang)
  }, [rows, coTrang, trangHienTai])

  // Dòng đã chọn nhưng không còn trong `rows` (vừa xóa / vừa lọc) thì bỏ khỏi vùng chọn.
  useEffect(() => {
    if (!selectable) return
    const conLai = rows.filter((r) => chon.has(rowKey(r)))
    onSelectionChange?.(conLai)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chon, rows])

  const doiMo = (key) =>
    setMo((cu) => {
      const moi = new Set(cu)
      if (moi.has(key)) moi.delete(key)
      else moi.add(key)
      return moi
    })

  const doiChon = (key) =>
    setChon((cu) => {
      const moi = new Set(cu)
      if (moi.has(key)) moi.delete(key)
      else moi.add(key)
      return moi
    })

  // Checkbox ở header: chỉ chọn/bỏ chọn các dòng đang hiển thị trên trang này.
  const chonHetTrang = dongHienThi.length > 0 && dongHienThi.every((r) => chon.has(rowKey(r)))
  const doiChonHetTrang = () =>
    setChon((cu) => {
      const moi = new Set(cu)
      for (const r of dongHienThi) {
        if (chonHetTrang) moi.delete(rowKey(r))
        else moi.add(rowKey(r))
      }
      return moi
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-12 text-sm text-slate-400 shadow-sm">
        <Loader2 size={16} className="animate-spin text-[#115EA8]" /> Đang tải...
      </div>
    )
  }

  const dau = rows.length ? (trangHienTai - 1) * coTrang + 1 : 0
  const cuoi = Math.min(trangHienTai * coTrang, rows.length)

  // Tổng số cột (kể cả các cột phụ) -> colSpan cho dòng chi tiết và dòng "không có dữ liệu"
  const soCot =
    columns.length +
    1 + // STT
    (renderExpanded ? 1 : 0) +
    (selectable ? 1 : 0) +
    (actions ? 1 : 0)

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Màn hẹp: cuộn ngang trong khung bảng, không đẩy vỡ cả trang */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {/* Header xanh đậm, chữ trắng - tông chủ đạo của hệ thống */}
          <thead className="bg-gradient-to-b from-[#1567b8] to-[#115EA8] text-white">
            <tr>
              {renderExpanded && <th className="w-8 border-r border-white/20 px-1 py-3" />}
              {selectable && (
                <th className="w-10 border-r border-white/20 px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={chonHetTrang}
                    onChange={doiChonHetTrang}
                    aria-label="Chọn tất cả dòng trên trang"
                    className="accent-white"
                  />
                </th>
              )}
              <th className="w-14 border-r border-white/20 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                STT
              </th>
              {actions && <th className="w-12 border-r border-white/20 px-2 py-3" />}
              {columns.map((c) => (
                <th
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={`border-r border-white/20 px-3 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap last:border-r-0 ${
                    c.align === 'center'
                      ? 'text-center'
                      : c.align === 'right'
                        ? 'text-right'
                        : ''
                  }`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!rows.length && (
              <tr>
                <td colSpan={soCot} className="py-14 text-center text-slate-400">
                  {empty}
                </td>
              </tr>
            )}

            {dongHienThi.map((row, i) => {
              const key = rowKey(row)
              const daChon = chon.has(key)
              const daMo = mo.has(key)
              return (
                <Fragment key={key}>
                <tr
                  // Kẻ sọc xen kẽ, dòng đang chọn tô xanh nhạt + vạch xanh bên trái
                  className={`border-b border-slate-100 transition-colors ${
                    daChon || daMo
                      ? 'bg-[#115EA8]/10 shadow-[inset_3px_0_0_0_#115EA8]'
                      : `${i % 2 ? 'bg-slate-50/70' : 'bg-white'} hover:bg-amber-50`
                  }`}
                >
                  {renderExpanded && (
                    <td className="px-1 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => doiMo(key)}
                        aria-label={daMo ? 'Thu gọn' : 'Xem chi tiết'}
                        aria-expanded={daMo}
                        className="rounded p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-[#115EA8]"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${daMo ? '' : '-rotate-90'}`}
                        />
                      </button>
                    </td>
                  )}

                  {selectable && (
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={daChon}
                        onChange={() => doiChon(key)}
                        aria-label={`Chọn dòng ${key}`}
                        className="accent-[#115EA8]"
                      />
                    </td>
                  )}

                  <td className="px-2 py-2.5 text-center text-xs text-slate-400">
                    {(trangHienTai - 1) * coTrang + i + 1}
                  </td>

                  {actions && (
                    <td className="px-2 py-2.5">
                      <ActionMenu actions={actions(row)} />
                    </td>
                  )}

                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2.5 text-slate-700 ${
                        c.align === 'center'
                          ? 'text-center'
                          : c.align === 'right'
                            ? 'text-right'
                            : ''
                      }`}
                    >
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>

                {/* Dòng chi tiết: trải hết chiều ngang, nền vàng nhạt như grid ASP.NET */}
                {daMo && (
                  <tr>
                    <td
                      colSpan={soCot}
                      className="border-b border-amber-200 bg-amber-50/60 p-3"
                    >
                      {renderExpanded(row)}
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Chân bảng: điều hướng trang - cỡ trang - tổng số dòng */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <NutTrang
            onClick={() => setTrang(1)}
            disabled={trangHienTai <= 1}
            label="Trang đầu"
            icon={ChevronsLeft}
          />
          <NutTrang
            onClick={() => setTrang(trangHienTai - 1)}
            disabled={trangHienTai <= 1}
            label="Trang trước"
            icon={ChevronLeft}
          />

          {Array.from({ length: soTrang }, (_, i) => i + 1)
            // Chỉ hiện tối đa 5 số trang quanh trang hiện tại cho khỏi tràn.
            .filter((p) => Math.abs(p - trangHienTai) <= 2)
            .map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTrang(p)}
                className={`min-w-7 rounded border px-2 py-1 text-center transition ${
                  p === trangHienTai
                    ? 'border-[#115EA8] bg-[#115EA8] font-semibold text-white shadow-sm'
                    : 'border-slate-300 bg-white hover:border-[#115EA8] hover:text-[#115EA8]'
                }`}
              >
                {p}
              </button>
            ))}

          <NutTrang
            onClick={() => setTrang(trangHienTai + 1)}
            disabled={trangHienTai >= soTrang}
            label="Trang sau"
            icon={ChevronRight}
          />
          <NutTrang
            onClick={() => setTrang(soTrang)}
            disabled={trangHienTai >= soTrang}
            label="Trang cuối"
            icon={ChevronsRight}
          />
        </div>

        <label className="flex items-center gap-1.5">
          <select
            value={coTrang}
            onChange={(e) => {
              setCoTrang(Number(e.target.value))
              setTrang(1)
            }}
            className="rounded border border-slate-300 bg-white px-2 py-1 outline-none focus:border-[#115EA8]"
          >
            {CO_TRANG.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          mẫu tin/trang
        </label>

        <span className="ml-auto rounded-full bg-[#115EA8]/10 px-3 py-1 text-xs font-medium whitespace-nowrap text-[#115EA8]">
          {dau} - {cuoi} của {rows.length}
        </span>
      </div>
    </div>
  )
}

function NutTrang({ onClick, disabled, label, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded border border-slate-300 bg-white p-1 text-slate-500 transition hover:border-[#115EA8] hover:text-[#115EA8] disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-500"
    >
      <Icon size={14} />
    </button>
  )
}
