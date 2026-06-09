import { useEffect, useRef } from 'react'
import { RotateCcw, RotateCw } from 'lucide-react'
import Hls from 'hls.js'

const SKIP_SECONDS = 10

/**
 * Trình phát HLS: tải từng chunk (.m3u8/.ts), KHÔNG tải nguyên video gốc.
 * - Chrome/Firefox: dùng hls.js (giới hạn buffer để seek nhanh, ít tốn băng thông)
 * - Safari/iOS: phát HLS native
 * - Có nút tua lùi / tiến 10s; hạn chế tải video xuống (ẩn download, chặn chuột phải, tắt PiP).
 */
export default function HlsPlayer({ src, className, poster }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    let hls
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari hỗ trợ HLS sẵn
      video.src = src
    } else if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        // Buffer phía trước: đủ để xem mượt, không tải dư cả video
        maxBufferLength: 60, // buffer ~60s phía trước
        maxMaxBufferLength: 120,
        // Giữ phần ĐÃ XEM trong bộ đệm -> kéo lùi trong vùng này không nạp lại
        backBufferLength: 120, // giữ 120s phía sau
        maxBufferHole: 0.5, // khi seek, bỏ qua các segment cũ
        xhrSetup: (xhr) => {
          xhr.timeout = 10000 // abort request treo sau 10s
        },
      })
      hls.loadSource(src)
      hls.attachMedia(video)
    } else {
      video.src = src // trình duyệt quá cũ: thử phát trực tiếp
    }

    return () => {
      if (hls) hls.destroy()
    }
  }, [src])

  // Tua tương đối (giây), kẹp trong [0, duration]
  const seekBy = (delta) => {
    const video = videoRef.current
    if (!video) return
    const duration = Number.isFinite(video.duration) ? video.duration : Infinity
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), duration)
  }

  return (
    <div className={`group relative ${className ?? ''}`}>
      <video
        ref={videoRef}
        className="h-full w-full"
        poster={poster}
        controls
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Nút tua lùi / tiến 10s (đặt phía trên thanh điều khiển native) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-14 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => seekBy(-SKIP_SECONDS)}
          aria-label={`Tua lùi ${SKIP_SECONDS} giây`}
          className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white opacity-0 transition hover:bg-black/65 group-hover:opacity-100"
        >
          <RotateCcw size={18} />
          {SKIP_SECONDS}
        </button>
        <button
          type="button"
          onClick={() => seekBy(SKIP_SECONDS)}
          aria-label={`Tua tiến ${SKIP_SECONDS} giây`}
          className="pointer-events-auto flex items-center gap-1 rounded-full bg-black/45 px-3 py-2 text-xs font-semibold text-white opacity-0 transition hover:bg-black/65 group-hover:opacity-100"
        >
          <RotateCw size={18} />
          {SKIP_SECONDS}
        </button>
      </div>
    </div>
  )
}
