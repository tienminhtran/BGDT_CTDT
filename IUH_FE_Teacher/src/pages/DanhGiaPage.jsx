import { useState } from 'react'
import { Loader2, AlertTriangle, Search, Star, MessageSquare, Eye } from 'lucide-react'
import { PageHeading } from '../components/QuanLyLayout'
import { danhGiaService } from '../services'

// Trang "Quản lý đánh giá": nhập mã bài giảng để xem thống kê
// sao trung bình, phân bố sao, lượt xem và số bình luận.
export default function DanhGiaPage() {
  const [lectureId, setLectureId] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [data, setData] = useState(null)

  const load = async (e) => {
    e.preventDefault()
    const id = lectureId.trim()
    if (!id) return
    setLoading(true)
    setErr('')
    setData(null)
    try {
      const res = await danhGiaService.getDanhGia(id)
      setData(res)
    } catch (e) {
      setErr(e?.response?.data?.message || 'Không tải được đánh giá bài giảng')
    } finally {
      setLoading(false)
    }
  }

  // Chuẩn hoá phân bố sao (5 -> 1) dù backend trả object hay mảng.
  const dist = data?.distribution || {}
  const phanBo = [5, 4, 3, 2, 1].map((sao) => ({
    sao,
    soLuong: Number(dist[sao] ?? dist[String(sao)] ?? 0),
  }))
  const maxSL = Math.max(1, ...phanBo.map((r) => r.soLuong))

  const average = Number(data?.average ?? 0)
  const total = Number(data?.total ?? 0)
  const luotXem = data?.views ?? data?.luotXem ?? null
  const binhLuan = data?.comments ?? data?.soBinhLuan ?? null

  return (
    <>
      <PageHeading
        icon={Star}
        title="Quản lý đánh giá"
        desc="Thống kê sao, bình luận và lượt xem của một bài giảng."
      />

      <div className="space-y-4">
        <form onSubmit={load}>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Mã bài giảng cần xem đánh giá
          </span>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={lectureId}
              onChange={(e) => setLectureId(e.target.value)}
              placeholder="Ví dụ: 13, 23..."
              className="min-w-0 flex-1  border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#115EA8] sm:max-w-md"
            />
            <button
              type="submit"
              disabled={loading || !lectureId.trim()}
              className="inline-flex shrink-0 items-center gap-1.5  bg-[#115EA8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d4a82] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Search size={16} />
              )}
              Xem đánh giá
            </button>
          </div>
        </form>

        {err && (
          <div className="flex items-center gap-2  bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} /> {err}
          </div>
        )}

        {data && (
          <>
            {/* Thẻ thống kê tổng quan */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ThongKeCard
                icon={Star}
                mau="text-amber-500"
                nhan="Sao trung bình"
                giaTri={average ? average.toFixed(1) : '—'}
              />
              <ThongKeCard
                icon={MessageSquare}
                mau="text-[#115EA8]"
                nhan="Số bình luận"
                giaTri={binhLuan ?? total}
              />
              <ThongKeCard
                icon={Eye}
                mau="text-[#43a811]"
                nhan="Lượt xem"
                giaTri={luotXem ?? '—'}
              />
            </div>

            {/* Phân bố sao */}
            <div className=" border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Star size={16} className="text-amber-500" /> Phân bố đánh giá ({total} lượt)
              </h3>
              <div className="space-y-2">
                {phanBo.map(({ sao, soLuong }) => (
                  <div key={sao} className="flex items-center gap-2 text-sm">
                    <span className="flex w-10 shrink-0 items-center gap-0.5 text-slate-600">
                      {sao} <Star size={12} className="fill-amber-400 text-amber-400" />
                    </span>
                    <div className="h-2.5 flex-1 overflow-hidden bg-slate-100">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(soLuong / maxSL) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-slate-500">{soLuong}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!data && !err && !loading && (
          <p className="text-sm text-slate-500">
            Nhập mã bài giảng và bấm “Xem đánh giá” để hiển thị thống kê sao, bình luận và lượt xem.
          </p>
        )}
      </div>
    </>
  )
}

// Thẻ số liệu nhỏ dùng trong trang Quản lý đánh giá.
function ThongKeCard({ icon: Icon, mau, nhan, giaTri }) {
  return (
    <div className=" border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} className={mau} />
        <span className="text-xs font-medium">{nhan}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold text-slate-800">{giaTri}</p>
    </div>
  )
}
