import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '../constants'
import { useTabsStore } from '../store/tabsStore'
import {
  QuanLyBaiGiangPage,
  ImportPage,
  DanhGiaPage,
  ThongTinSinhVienPage,
  ThuMucVideoPage,
} from '../pages'

// Trang tương ứng mỗi tab. Router chỉ còn lo việc khớp URL, việc render trang do đây quyết định.
const TRANG_THEO_PATH = {
  [ROUTES.home]: QuanLyBaiGiangPage,
  [ROUTES.danhGia]: DanhGiaPage,
  [ROUTES.importHocPhan]: ImportPage,
  [ROUTES.thongTinSinhVien]: ThongTinSinhVienPage,
  [ROUTES.thumucvideobg]: ThuMucVideoPage,
}

/**
 * Giữ nguyên state của trang khi chuyển tab (keep-alive).
 *
 * Mọi tab đang mở đều được render cùng lúc, trang không xem thì ẨN (hidden).
 * Mỗi trang có key = path cố định nên React giữ nguyên instance qua các lần đổi
 * tab -> state (môn đang chọn, ô tìm kiếm, dữ liệu đã tải...) còn nguyên khi quay lại.
 * Đóng tab -> trang biến mất khỏi danh sách -> unmount thật, mở lại chạy từ đầu.
 *
 * Lưu ý: trang bị ẩn VẪN đang mount (timer/polling vẫn chạy nền). Riêng video
 * được tạm dừng tự động, xem TrangGiuState.
 */
export default function KeepAliveOutlet() {
  const { pathname } = useLocation()
  const tabs = useTabsStore((s) => s.tabs)

  return (
    <>
      {tabs.map((tab) => {
        const Page = TRANG_THEO_PATH[tab.path]
        if (!Page) return null

        return (
          <TrangGiuState key={tab.path} an={tab.path !== pathname}>
            <Page />
          </TrangGiuState>
        )
      })}
    </>
  )
}

// Trang bị ẩn vẫn đang mount nên video sẽ phát tiếng ngầm -> tạm dừng mọi <video>
// bên trong khi trang bị ẩn (mở lại vẫn đúng chỗ đang xem dở).
function TrangGiuState({ an, children }) {
  const boc = useRef(null)

  useEffect(() => {
    if (!an || !boc.current) return
    boc.current.querySelectorAll('video').forEach((v) => v.pause())
  }, [an])

  return (
    <div ref={boc} hidden={an} className="min-w-0">
      {children}
    </div>
  )
}
