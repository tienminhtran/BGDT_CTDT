import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Hộp thoại dùng chung: lớp phủ mờ + khung trắng ở giữa màn hình.
 * Đóng bằng nút X, click lớp phủ, hoặc Esc.
 */
export default function Modal({ open, onClose, title, icon: Icon, children, width = 'max-w-3xl' }) {
  useEffect(() => {
    if (!open) return

    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', esc)

    // Khóa cuộn nền để không cuộn trang phía sau khi modal đang mở.
    const cuonCu = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = cuonCu
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8"
    >
      <div
        // Chặn nổi bọt: click bên trong khung thì không đóng modal.
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${width} overflow-hidden rounded-lg bg-white shadow-2xl`}
      >
        <div className="flex items-center gap-2 bg-gradient-to-b from-[#1567b8] to-[#115EA8] px-4 py-3 text-white">
          {Icon && <Icon size={18} className="shrink-0" />}
          <h2 className="font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="ml-auto rounded p-1 transition hover:bg-white/15"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
