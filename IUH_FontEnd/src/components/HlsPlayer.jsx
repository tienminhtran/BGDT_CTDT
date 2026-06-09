import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

/**
 * Trình phát HLS: tải từng chunk (.m3u8/.ts), KHÔNG tải nguyên video gốc.
 * - Chrome/Firefox: dùng hls.js
 * - Safari/iOS: phát HLS native
 * Đồng thời hạn chế tải video xuống (ẩn nút download, chặn chuột phải, tắt PiP).
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
      hls = new Hls({ enableWorker: true })
      hls.loadSource(src)
      hls.attachMedia(video)
    } else {
      video.src = src // trình duyệt quá cũ: thử phát trực tiếp
    }

    return () => {
      if (hls) hls.destroy()
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      className={className}
      poster={poster}
      controls
      controlsList="nodownload noplaybackrate noremoteplayback"
      disablePictureInPicture
      onContextMenu={(e) => e.preventDefault()}
    />
  )
}
