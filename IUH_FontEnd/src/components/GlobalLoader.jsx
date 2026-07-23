import { useSyncExternalStore } from 'react'
import { subscribe, getSnapshot } from '../api/loadingStore'
import BookLoader from './Bookloader'

// Nơi DUY NHẤT hiển thị loading toàn cục. Đặt ở gốc app, chỉ "lắng nghe" bộ đếm request:
// có ít nhất 1 request (không silent) đang chạy -> hiện; về 0 -> ẩn. Không màn hình nào tự bật/tắt.
export default function GlobalLoader() {
  const loading = useSyncExternalStore(subscribe, getSnapshot)

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
      <BookLoader color="#ffffff" size={1.4} />
    </div>
  )
}
