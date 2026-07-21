import { useEffect, useState } from 'react'
import {
  Folder,
  FolderOpen,
  FileVideo,
  FileText,
  File as FileIcon,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  HardDrive,
  Files,
} from 'lucide-react'
import PageHeading from '../components/PageHeading'
import { luuTruService } from '../services'

/**
 * Trang "Thư mục video bài giảng": duyệt cây thư mục trên MinIO.
 *
 * Bucket có hàng chục nghìn object (mỗi segment .ts là 1 file) nên KHÔNG tải cả
 * cây một lần — mở thư mục nào mới gọi API nạp đúng cấp đó, rồi nhớ lại (cache)
 * để lần mở sau không gọi lại.
 *
 * Cấu trúc thật: stream|chunk/[mã môn]/[phiên bản]/[id chương]/...
 */
export default function ThuMucVideoPage() {
  const [goc, setGoc] = useState({ loading: true, thuMuc: [], file: [], error: '' })
  const [tong, setTong] = useState(null)
  const [lanTai, setLanTai] = useState(0)

  useEffect(() => {
    let alive = true
    luuTruService
      .lietKe('')
      .then(
        (d) =>
          alive && setGoc({ loading: false, thuMuc: d.thuMuc, file: d.file, error: '' })
      )
      .catch(
        (e) =>
          alive &&
          setGoc({
            loading: false,
            thuMuc: [],
            file: [],
            error: e?.response?.data?.message || 'Không đọc được thư mục trên MinIO',
          })
      )
    return () => {
      alive = false
    }
  }, [lanTai])

  // Tổng dung lượng phải quét toàn bộ bucket (~15k object) -> gọi riêng, chạy chậm hơn
  // và không chặn việc hiển thị cây.
  useEffect(() => {
    let alive = true
    luuTruService
      .tongKet('')
      .then((t) => alive && setTong(t))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [lanTai])

  return (
    <>
      <PageHeading
        icon={Folder}
        title="Thư mục video bài giảng"
        desc="Cấu trúc lưu trữ trên MinIO: stream · chunk / [mã môn] / [phiên bản] / [id chương]"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TheSoLieu
          icon={Folder}
          nhan="Thư mục gốc (stream · chunk)"
          so={goc.thuMuc.length}
          mau="bg-[#115EA8]"
        />
        <TheSoLieu
          icon={Files}
          nhan="Tổng số file"
          so={tong ? tong.soFile.toLocaleString('vi-VN') : '…'}
          mau="bg-teal-600"
        />
        <TheSoLieu
          icon={HardDrive}
          nhan={tong ? `Dung lượng · bucket ${tong.bucket}` : 'Dung lượng'}
          so={tong ? dinhDangDungLuong(tong.kichThuoc) : '…'}
          mau="bg-violet-600"
        />
      </div>

      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setLanTai((n) => n + 1)}
          className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          <RefreshCw size={15} /> Tải lại
        </button>
      </div>

      {goc.error && (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle size={15} /> {goc.error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 bg-gradient-to-b from-[#1567b8] to-[#115EA8] px-3 py-2.5 text-sm font-semibold text-white">
          <HardDrive size={16} />
          {tong?.bucket || 'baigiang'}
        </div>

        {goc.loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
            <Loader2 size={16} className="animate-spin text-[#115EA8]" /> Đang tải...
          </div>
        ) : !goc.thuMuc.length && !goc.file.length ? (
          <p className="py-12 text-center text-sm text-slate-400">Bucket đang trống</p>
        ) : (
          <ul className="py-1">
            {goc.thuMuc.map((tm) => (
              <NutThuMuc key={tm.duongDan} nut={tm} cap={0} />
            ))}
            {goc.file.map((f) => (
              <NutFile key={f.duongDan} nut={f} cap={0} />
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

/**
 * 1 thư mục trong cây. Lần đầu bung ra mới gọi API nạp con, sau đó giữ lại trong state.
 */
function NutThuMuc({ nut, cap }) {
  const [mo, setMo] = useState(false)
  const [con, setCon] = useState(null) // null = chưa nạp
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [tong, setTong] = useState(null)

  const bung = async () => {
    setMo((v) => !v)
    if (con || loading) return // đã nạp rồi -> chỉ đóng/mở, không gọi lại API

    setLoading(true)
    setErr('')
    try {
      const [d, t] = await Promise.all([
        luuTruService.lietKe(nut.duongDan),
        luuTruService.tongKet(nut.duongDan),
      ])
      setCon(d)
      setTong(t)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Không đọc được thư mục')
    } finally {
      setLoading(false)
    }
  }

  return (
    <li>
      <button
        type="button"
        onClick={bung}
        style={{ paddingLeft: 12 + cap * 20 }}
        className="flex w-full items-center gap-2 py-1.5 pr-3 text-left text-sm transition hover:bg-amber-50"
      >
        <ChevronRight
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${mo ? 'rotate-90' : ''}`}
        />
        {mo ? (
          <FolderOpen size={16} className="shrink-0 text-amber-500" />
        ) : (
          <Folder size={16} className="shrink-0 text-amber-500" />
        )}
        <span className="truncate font-medium text-slate-700">{nut.ten}</span>

        {loading && <Loader2 size={13} className="shrink-0 animate-spin text-slate-400" />}

        {tong && (
          <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-slate-400">
            <span>{tong.soFile.toLocaleString('vi-VN')} file</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
              {dinhDangDungLuong(tong.kichThuoc)}
            </span>
          </span>
        )}
      </button>

      {err && (
        <p
          style={{ paddingLeft: 12 + (cap + 1) * 20 }}
          className="py-1 text-xs text-red-600"
        >
          {err}
        </p>
      )}

      {mo && con && (
        <ul>
          {!con.thuMuc.length && !con.file.length && (
            <p
              style={{ paddingLeft: 12 + (cap + 1) * 20 }}
              className="py-1.5 text-xs text-slate-400"
            >
              Thư mục rỗng
            </p>
          )}
          {con.thuMuc.map((tm) => (
            <NutThuMuc key={tm.duongDan} nut={tm} cap={cap + 1} />
          ))}
          {con.file.map((f) => (
            <NutFile key={f.duongDan} nut={f} cap={cap + 1} />
          ))}
        </ul>
      )}
    </li>
  )
}

// 1 file: icon theo đuôi, kèm dung lượng và thời điểm sửa đổi.
function NutFile({ nut, cap }) {
  return (
    <li
      style={{ paddingLeft: 12 + cap * 20 + 20 }} // +20: thẳng hàng với tên thư mục (bù chỗ mũi tên)
      className="flex items-center gap-2 py-1.5 pr-3 text-sm hover:bg-slate-50"
    >
      <IconFile ten={nut.ten} />
      <span className="truncate text-slate-600">{nut.ten}</span>
      <span className="ml-auto flex shrink-0 items-center gap-3 text-xs text-slate-400">
        {nut.capNhat && <span className="hidden sm:block">{dinhDangNgay(nut.capNhat)}</span>}
        <span className="font-medium">{dinhDangDungLuong(nut.kichThuoc)}</span>
      </span>
    </li>
  )
}

// Icon theo đuôi file: video (.mp4/.ts), playlist HLS (.m3u8), còn lại là file thường.
function IconFile({ ten }) {
  const t = ten.toLowerCase()
  const chung = 'shrink-0'

  if (t.endsWith('.mp4') || t.endsWith('.ts'))
    return <FileVideo size={15} className={`${chung} text-[#115EA8]`} />
  if (t.endsWith('.m3u8'))
    return <FileText size={15} className={`${chung} text-emerald-600`} />
  return <FileIcon size={15} className={`${chung} text-slate-400`} />
}

// 31120001613 -> "28.98 GB"
function dinhDangDungLuong(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  const donVi = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < donVi.length - 1) {
    v /= 1024
    i += 1
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${donVi[i]}`
}

function dinhDangNgay(t) {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ''
  const hai = (x) => String(x).padStart(2, '0')
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`
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
