import { useEffect, useState } from 'react'
import { PlayCircle, Loader2, AlertTriangle } from 'lucide-react'
import Modal from './Modal'
import HlsPlayer from './HlsPlayer'
import { baiGiangService } from '../services'

/**
 * Modal xem nhanh 1 video bài giảng theo baiGiangId.
 * Lấy url phát HLS qua route giảng viên (getVideoTheoId), rồi phát bằng HlsPlayer.
 */
export default function VideoModal({ baiGiangId, tieuDe, open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title={tieuDe || 'Xem video bài giảng'} icon={PlayCircle}>
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        {/* key theo baiGiangId: đổi bài giảng thì remount, tự về trạng thái tải mới */}
        {open && baiGiangId ? <NoiDungVideo key={baiGiangId} baiGiangId={baiGiangId} /> : null}
      </div>
    </Modal>
  )
}

function NoiDungVideo({ baiGiangId }) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })

  useEffect(() => {
    let alive = true
    baiGiangService
      .getVideoTheoId(baiGiangId)
      .then((data) => alive && setState({ loading: false, data, error: '' }))
      .catch(
        (err) =>
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
  }, [baiGiangId])

  const { loading, data, error } = state

  if (data?.url) {
    return <HlsPlayer key={data.baiGiangId} src={data.url} className="h-full w-full" autoPlay />
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-white/80">
      {loading ? (
        <>
          <Loader2 className="animate-spin" size={36} />
          <p className="text-sm">Đang tải video...</p>
        </>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle size={16} /> {error}
        </div>
      ) : (
        <>
          <PlayCircle size={48} />
          <p className="text-sm">
            {data?.coVideo ? 'Bài giảng chưa có bản phát (HLS)' : 'Bài giảng chưa có video'}
          </p>
        </>
      )}
    </div>
  )
}
