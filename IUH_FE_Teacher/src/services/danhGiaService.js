import * as XLSX from 'xlsx'
import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Thống kê đánh giá tổng hợp của bài giảng (công khai, chỉ để hiển thị).
// Trả về { total, average, distribution }.
export const getDanhGia = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.reviews.byLecture(lectureId))
  return data
}

// Thống kê theo phiên bản môn học:
// [{ versionId, version, maTuQuan, tenMon, soBaiGiang, soVideo, tongLuotXem, soDanhGia, saoTrungBinh }]
export const getTongQuan = async () => {
  const { data } = await http.get(ENDPOINTS.reviews.overview)
  return data.items || []
}

// dd/mm/yyyy hh:mm — để Excel hiển thị đúng giờ Việt Nam, không phải chuỗi ISO.
const dinhDangGio = (t) => {
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return ''
  const hai = (n) => String(n).padStart(2, '0')
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()} ${hai(d.getHours())}:${hai(d.getMinutes())}`
}

// Bỏ ký tự không hợp lệ trong tên file (Windows cấm \ / : * ? " < > |).
const tenFileAnToan = (s) => String(s || 'mon-hoc').replace(/[\\/:*?"<>|]/g, '-').trim()

/**
 * Tải file Excel danh sách bình luận của 1 phiên bản môn học.
 * Cột: STT, MSSV, Số sao, Bình luận, Thời gian (+ Bài giảng để biết bình luận thuộc chương nào).
 *
 * @returns {Promise<number>} số dòng đã xuất (0 = chưa có bình luận nào)
 */
export const xuatExcelBinhLuan = async (row) => {
  const { data } = await http.get(ENDPOINTS.reviews.comments(row.versionId))
  const items = data.items || []
  if (!items.length) return 0

  const rows = items.map((r, i) => ({
    STT: i + 1,
    MSSV: r.mssv,
    'Số sao': r.sao,
    'Bình luận': r.binhLuan || '',
    'Thời gian': dinhDangGio(r.thoiGian),
    'Bài giảng': r.tenBaiGiang || '',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = [
    { wch: 5 }, // STT
    { wch: 12 }, // MSSV
    { wch: 8 }, // Số sao
    { wch: 50 }, // Bình luận
    { wch: 18 }, // Thời gian
    { wch: 40 }, // Bài giảng
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Binh luan')
  XLSX.writeFile(wb, `binh-luan_${tenFileAnToan(row.maTuQuan)}_v${row.version}.xlsx`)

  return rows.length
}
