import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PlayCircle, Loader2, AlertTriangle } from 'lucide-react'
import Layout from '../components/Layout'
import HlsPlayer from '../components/HlsPlayer'
import { baiGiangService } from '../services'

// Xem 1 video riêng lẻ CHỈ BẰNG id (tb_BaiGiang). Backend kiểm tra KEY_LOGIN_TEACHER
// (gửi sẵn ở header x-teacher-key) và trả luôn url phát HLS.
export default function VideoTheoIdPage() {
  const { id } = useParams()
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let alive = true
    setState({ loading: true, data: null, error: '' })
    baiGiangService
      .getVideoTheoId(id)
      .then((data) => alive && setState({ loading: false, data, error: '' }))
      .catch((err) =>
        alive &&
        setState({
          loading: false,
          data: null,
          error: err?.response?.data?.message || 'Không tải được video',
        })
      )
    return () => {
      alive = false
    }
  }, [id])

  const { loading, data, error } = state

  return (
    <Layout>
      <main className="mx-auto w-full max-w-[1100px] px-4 py-6">
        {error ? (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle size={16} /> {error}
          </div>
        ) : null}

        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
          {data?.url ? (
            <HlsPlayer
              key={data.baiGiangId}
              src={data.url}
              className="h-full w-full"
              watermark="Đây là bài giảng điện tử thuộc bản quyền Đại học Công nghiệp Thành Phố Hồ Chí Minh"
              allowFullscreen={false}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-white/80">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={40} />
                  <p className="mt-3 text-sm">Đang tải video...</p>
                </>
              ) : (
                <>
                  <PlayCircle size={64} className="opacity-90" />
                  <p className="mt-3 text-sm">
                    {data?.coVideo
                      ? 'Bài giảng chưa có bản phát (HLS)'
                      : 'Bài giảng chưa có video'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {data ? (
          <>
            <h1 className="mt-4 text-xl font-bold leading-snug text-slate-800">
              {data.tenBaiGiang || data.noiDungChuong || 'Bài giảng'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {data.subjectName ? `Môn ${data.subjectName}` : 'Bài giảng'}
              {data.version ? ` · Phiên bản ${data.version}` : ''}
            </p>
            {data.noiDungChuong ? (
              <div className="mt-4 rounded-xl bg-gray-200 p-4 text-sm leading-relaxed text-slate-600">
                <h2 className="mb-2 font-semibold text-slate-800">Mô tả bài học</h2>
                {data.noiDungChuong}
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </Layout>
  )
}
