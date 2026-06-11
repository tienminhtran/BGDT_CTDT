import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PlayCircle, Loader2, AlertTriangle } from 'lucide-react'
import HlsPlayer from '../components/HlsPlayer'
import { baiGiangService } from '../services'

// Xem 1 video riêng lẻ CHỈ BẰNG id (tb_BaiGiang). Backend kiểm tra KEY_LOGIN_TEACHER
// (gửi sẵn ở header x-teacher-key) và trả luôn url phát HLS.
// Trang tối giản: không layout, không thông tin chương — chỉ 1 video.
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
    <div className="relative h-screen w-screen overflow-hidden bg-black">
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
          ) : error ? (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle size={16} /> {error}
            </div>
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
  )
}
