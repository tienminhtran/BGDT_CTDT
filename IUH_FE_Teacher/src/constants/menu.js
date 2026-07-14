import { BookOpen, FileSpreadsheet, Folder, Star, Users } from 'lucide-react'
import { ROUTES } from './routes'

/**
 * Menu bên trái, gom theo nhóm (giống hệ thống nội bộ của trường).
 * Mỗi mục khi bấm sẽ được ghim thành 1 tab ở thanh tab phía trên.
 *   - end  : route "/" cần end để không khớp mọi đường dẫn con
 *   - fixed: tab không cho đóng (trang mặc định)
 */
export const NHOM_MENU = [
  {
    tieuDe: 'Bài giảng điện tử',
    items: [
      {
        to: ROUTES.home,
        end: true,
        fixed: true,
        label: 'Quản lý bài giảng',
        icon: BookOpen,
      },
      {
        to: ROUTES.danhGia,
        label: 'Quản lý đánh giá',
        icon: Star,
      },
    ],
  },
  {
    tieuDe: 'Dữ liệu',
    items: [
      {
        to: ROUTES.importHocPhan,
        label: 'Học phần – Môn học',
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    tieuDe: 'Hệ thống',
    items: [
      {
        to: ROUTES.thongTinSinhVien,
        label: 'Thông tin sinh viên',
        icon: Users,
      },
      {
        to: ROUTES.thumucvideobg,
        label: 'Thư mục video bài giảng',
        icon: Folder,
      }
    ],
  }
]

// Phẳng hóa để tra cứu nhanh theo path (thanh tab cần label/icon từ path).
export const MENU_ITEMS = NHOM_MENU.flatMap((n) => n.items)

export const timMenuTheoPath = (path) =>
  MENU_ITEMS.find((m) => m.to === path) || null
