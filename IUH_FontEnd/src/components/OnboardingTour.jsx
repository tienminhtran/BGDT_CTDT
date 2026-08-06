import { useCallback, useEffect, useState } from 'react'
/**
 * OnboardingTour — spotlight tour thuần React + Tailwind (không cần thư viện ngoài).
 *
 * Cách dùng:
 * 1. Đánh dấu các phần tử muốn highlight bằng attribute: data-tour="ten-buoc"
 * 2. Truyền mảng steps: [{ target: 'ten-buoc', title, desc }]
 * 3. Render <OnboardingTour steps={...} isOpen={showTour} onClose={() => setShowTour(false)} storageKey="key_luu_da_xem" />
 */
export default function OnboardingTour({ steps, isOpen, onClose, storageKey }) {
  const [current, setCurrent] = useState(0)
  const [rect, setRect] = useState(null)

  const getTargetEl = useCallback(() => {
    const step = steps[current]
    return step ? document.querySelector(`[data-tour="${step.target}"]`) : null
  }, [current, steps])

  // Cuộn tới phần tử + đo vị trí liên tục trong lúc cuộn — CHỈ chạy khi đổi bước.
  // Đo bằng requestAnimationFrame (không dùng sự kiện 'scroll') để tránh
  // vòng lặp gọi lại scrollIntoView làm trang bị "đá" và đứng im.
  useEffect(() => {
    if (!isOpen) return
    const el = getTargetEl()
    if (!el) {
      setRect(null)
      return
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    let raf
    let lastTop = null
    let stableCount = 0
    const measure = () => {
      const r = el.getBoundingClientRect()
      setRect(r)
      if (lastTop !== null && Math.abs(r.top - lastTop) < 0.5) {
        stableCount += 1
      } else {
        stableCount = 0
      }
      lastTop = r.top
      if (stableCount < 6) {
        raf = requestAnimationFrame(measure)
      }
    }
    raf = requestAnimationFrame(measure)
    return () => cancelAnimationFrame(raf)
  }, [isOpen, current, getTargetEl])

  // Cập nhật lại vị trí khi resize hoặc người dùng tự cuộn tay —
  // CHỈ đo vị trí, không gọi scrollIntoView để tránh vòng lặp.
  useEffect(() => {
    if (!isOpen) return
    const onUpdate = () => {
      const el = getTargetEl()
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onUpdate)
    window.addEventListener('scroll', onUpdate, true)
    return () => {
      window.removeEventListener('resize', onUpdate)
      window.removeEventListener('scroll', onUpdate, true)
    }
  }, [isOpen, getTargetEl])

  useEffect(() => {
    if (isOpen) setCurrent(0)
  }, [isOpen])

  if (!isOpen || !steps?.length) return null

  const step = steps[current]
  const isLast = current === steps.length - 1
  const pad = 8

  const box = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null

  const finish = () => {
    if (storageKey) localStorage.setItem(storageKey, '1')
    onClose?.()
  }

  const handleNext = () => (isLast ? finish() : setCurrent((c) => c + 1))
  const handleSkip = () => finish()

  // Tooltip đặt phía dưới target nếu đủ chỗ, ngược lại đặt phía trên
  const spaceBelow = box ? window.innerHeight - (box.top + box.height) : 0
  const showBelow = box ? spaceBelow > 220 : true
  const tooltipWidth = 320

  const tooltipStyle = box
    ? {
        top: showBelow ? box.top + box.height + 16 : undefined,
        bottom: !showBelow ? window.innerHeight - box.top + 16 : undefined,
        left: Math.min(Math.max(box.left, 16), window.innerWidth - tooltipWidth - 16),
      }
    : { top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay tối, cắt lỗ sáng quanh phần tử đang highlight */}
      <div
        className="absolute inset-0 bg-black/60 transition-all duration-300"
        style={
          box
            ? {
                clipPath: `polygon(
                  0% 0%, 0% 100%, ${box.left}px 100%, ${box.left}px ${box.top}px,
                  ${box.left + box.width}px ${box.top}px, ${box.left + box.width}px ${box.top + box.height}px,
                  ${box.left}px ${box.top + box.height}px, ${box.left}px 100%,
                  100% 100%, 100% 0%
                )`,
              }
            : {}
        }
      />

      {/* Viền phát sáng quanh phần tử được chọn */}
      {box && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-blue-400 shadow-[0_0_0_4px_rgba(59,130,246,0.25)] transition-all duration-300"
          style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      )}

      {/* Tooltip hướng dẫn */}
      <div
        className="absolute rounded-xl bg-slate-900 p-4 text-white shadow-2xl transition-all duration-300"
        style={{ width: tooltipWidth, ...tooltipStyle }}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-white">{step.title}</h3>
          <button
            onClick={handleSkip}
            className="shrink-0 text-xs font-medium text-slate-300 underline underline-offset-2 hover:text-white"
          >
            Bỏ qua
          </button>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.desc}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'w-4 bg-blue-400' : 'w-1.5 bg-slate-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            {isLast ? 'Hoàn tất' : 'Tiếp tục'}
          </button>
        </div>
      </div>
    </div>
  )
}