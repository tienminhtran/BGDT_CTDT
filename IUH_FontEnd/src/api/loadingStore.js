// Trạng thái loading TOÀN CỤC, sống ở tầng hạ tầng (ngoài cây component React).
//
// Vì sao đếm số request thay vì boolean:
//   Nếu dùng isLoading = true/false, khi 2 request chạy song song, request xong
//   trước sẽ set false và tắt loading dù request sau vẫn đang chạy. Dùng bộ đếm:
//   mỗi request bắt đầu +1, kết thúc (thành công HAY lỗi) -1; loading chỉ tắt khi = 0.
//
// UI KHÔNG điều khiển trạng thái này — chỉ interceptor tăng/giảm, còn UI chỉ "lắng nghe".

let count = 0
const listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

// Một request bắt đầu -> +1
export function startRequest() {
  count += 1
  if (count === 1) emit() // 0 -> 1: bật loading
}

// Một request kết thúc (dù thành công hay lỗi) -> -1
export function endRequest() {
  if (count === 0) return // phòng gọi endRequest thừa
  count -= 1
  if (count === 0) emit() // về 0: tắt loading
}

// ---- API cho useSyncExternalStore ----
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot() {
  return count > 0
}
