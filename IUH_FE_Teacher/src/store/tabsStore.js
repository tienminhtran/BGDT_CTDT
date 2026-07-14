import { create } from 'zustand'

/**
 * Danh sách tab đang mở trên thanh tab (giống hệ thống nội bộ của trường):
 * bấm 1 mục ở menu trái -> ghim thành 1 tab; tab có nút X để đóng.
 *
 * Chỉ lưu { path, label } (dữ liệu thuần) — icon tra ngược từ MENU theo path,
 * vì component/icon không nên nằm trong store.
 * Tab có fixed = true (trang chủ) thì không cho đóng.
 */
export const useTabsStore = create((set) => ({
  tabs: [],

  // Mở tab (đã có rồi thì giữ nguyên, không nhân đôi).
  moTab: (tab) =>
    set((s) =>
      s.tabs.some((t) => t.path === tab.path) ? s : { tabs: [...s.tabs, tab] }
    ),

  dongTab: (path) =>
    set((s) => ({ tabs: s.tabs.filter((t) => t.path !== path || t.fixed) })),

  // Đóng hết trừ các tab fixed và tab đang xem.
  dongTabKhac: (path) =>
    set((s) => ({ tabs: s.tabs.filter((t) => t.fixed || t.path === path) })),
}))

/**
 * Đóng tab đang xem thì nhảy sang đâu: ưu tiên tab bên trái, không có thì tab bên phải.
 * @returns {string|null} path để điều hướng tới (null = không cần điều hướng)
 */
export function pathKeBen(tabs, path) {
  const i = tabs.findIndex((t) => t.path === path)
  if (i < 0) return null
  const ke = tabs[i - 1] || tabs[i + 1]
  return ke ? ke.path : null
}
