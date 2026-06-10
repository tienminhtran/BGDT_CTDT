import { useEffect, useRef, useState } from 'react'
import { RotateCcw, RotateCw, Maximize, Minimize } from 'lucide-react'
import Hls from 'hls.js'

const SKIP_SECONDS = 10

/**
 * Trình phát HLS: tải từng chunk (.m3u8/.ts), KHÔNG tải nguyên video gốc.
 * - Chrome/Firefox: dùng hls.js (giới hạn buffer để seek nhanh, ít tốn băng thông)
 * - Safari/iOS: phát HLS native
 * - Có nút tua lùi / tiến 10s; hạn chế tải video xuống (ẩn download, chặn chuột phải, tắt PiP).
 */
export default function HlsPlayer({
  src,
  className,
  poster,
  watermark,
  mssv,
  allowFullscreen = true,
}) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  // Vị trí lớp phủ MSSV (đổi mỗi khi tải 1 segment -> chống quay màn hình).
  const [wmPos, setWmPos] = useState({ top: 12, left: 12 })

  // Theo dõi trạng thái fullscreen (để đổi icon nút phóng to / thu nhỏ).
  useEffect(() => {
    const onFsChange = () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement
      setIsFullscreen(!!fsEl && fsEl === containerRef.current)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  // Phóng to KHUNG BAO (không phải thẻ <video>) để watermark luôn hiển thị.
  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement
    if (fsEl) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen
      exit?.call(document)
    } else {
      const req = el.requestFullscreen || el.webkitRequestFullscreen
      req?.call(el)
    }
  }

  // Đổi vị trí lớp phủ MSSV sang một điểm ngẫu nhiên trong khung video.
  const moveWatermark = () => {
    setWmPos({
      top: 8 + Math.random() * 74, // 8% -> 82% chiều cao
      left: 6 + Math.random() * 64, // 6% -> 70% chiều rộng
    })
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

    let hls
    let nativeTimer
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari hỗ trợ HLS sẵn (không có sự kiện FRAG_LOADED) -> đổi vị trí theo nhịp
      video.src = src
      if (mssv) nativeTimer = setInterval(moveWatermark, 8000)
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
      // Mỗi khi tải xong 1 segment -> nhảy lớp phủ MSSV sang vị trí mới
      if (mssv) hls.on(Hls.Events.FRAG_LOADED, moveWatermark)
    } else {
      video.src = src // trình duyệt quá cũ: thử phát trực tiếp
    }

    return () => {
      if (hls) hls.destroy()
      if (nativeTimer) clearInterval(nativeTimer)
    }
  }, [src, mssv])

  // Tua tương đối (giây), kẹp trong [0, duration]
  const seekBy = (delta) => {
    const video = videoRef.current
    if (!video) return
    const duration = Number.isFinite(video.duration) ? video.duration : Infinity
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), duration)
  }

  return (
    <div
      ref={containerRef}
      className={`group relative bg-black ${className ?? ''}`}
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        poster={poster}
        controls
        controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Dòng bản quyền phủ trên video — nền đen làm nổi chữ, hiện cả khi fullscreen */}
      {watermark ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
          <span className="max-w-full truncate rounded-b-md bg-black/60 px-3 py-1 text-center text-[11px] font-medium italic text-white/90 sm:text-xs">
            {watermark}
          </span>
        </div>
      ) : null}

      {/* Lớp phủ MSSV động — đổi chỗ mỗi khi tải segment, chống quay màn hình */}
      {mssv ? (
        <span
          className="pointer-events-none absolute z-10 select-none whitespace-nowrap text-base font-bold text-white/85 transition-all duration-700 drop-shadow-[0_2px_3px_rgba(0,0,0,1)]"
          style={{ top: `${wmPos.top}%`, left: `${wmPos.left}%` }}
        >
          {mssv}
        </span>
      ) : null}

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

      {/* Nút phóng to / thu nhỏ tự tạo — fullscreen vào khung bao để giữ watermark */}
      {allowFullscreen ? (
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
          className="absolute bottom-14 right-3 z-20 flex items-center justify-center rounded-md bg-black/55 p-2 text-white opacity-0 transition hover:bg-black/75 group-hover:opacity-100"
        >
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      ) : null}
    </div>
  )
}
