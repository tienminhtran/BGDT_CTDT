import { useEffect, useRef, useState } from 'react'
import { Grid3x3 } from 'lucide-react'

/**
 * Menu "THAO TÁC" của 1 dòng bảng (giống grid ASP.NET của trường):
 * nút mở nằm ở cột hẹp bên TRÁI dòng, popup bung ra phía dưới - bên phải nút.
 * Click ra ngoài hoặc Esc thì đóng.
 *
 * @param {Array<{label, icon, onClick, danger?, disabled?}>} actions
 */
export default function ActionMenu({ actions = [] }) {
  const [mo, setMo] = useState(false)
  const boc = useRef(null)

  useEffect(() => {
    if (!mo) return

    const ngoai = (e) => {
      if (!boc.current?.contains(e.target)) setMo(false)
    }
    const esc = (e) => e.key === 'Escape' && setMo(false)

    document.addEventListener('mousedown', ngoai)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', ngoai)
      document.removeEventListener('keydown', esc)
    }
  }, [mo])

  if (!actions.length) return null

  return (
    <div ref={boc} className="relative flex justify-center">
      <button
        type="button"
        aria-label="Thao tác"
        aria-expanded={mo}
        onClick={() => setMo((v) => !v)}
        className={`rounded border p-1 transition ${
          mo
            ? 'border-[#115EA8] bg-[#115EA8] text-white shadow-sm'
            : 'border-slate-300 bg-white text-slate-400 hover:border-[#115EA8] hover:text-[#115EA8]'
        }`}
      >
        <Grid3x3 size={14} />
      </button>

      {mo && (
        <div className="absolute top-full left-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#115EA8]">
            Thao tác
          </p>
          {actions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.label}
                type="button"
                disabled={a.disabled}
                onClick={() => {
                  setMo(false)
                  a.onClick()
                }}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  a.danger
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-slate-700 hover:bg-[#115EA8]/10 hover:text-[#115EA8]'
                }`}
              >
                {Icon && (
                  <Icon
                    size={15}
                    className={`shrink-0 ${a.danger ? 'text-red-500' : 'text-[#115EA8]'}`}
                  />
                )}
                {a.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
