import * as XLSX from 'xlsx'
import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Các tiêu đề cột chấp nhận được (chuẩn hóa: bỏ dấu cách thừa, thường hóa).
const norm = (s) => String(s ?? '').trim().toLowerCase()
const MA_MON_HEADERS = ['mã môn học', 'ma mon hoc', 'mamon', 'mã môn', 'ma mon']
const MA_HP_HEADERS = ['mã lớp học phần', 'ma lop hoc phan', 'mahocphan', 'mã học phần', 'ma hoc phan']

// Đọc file Excel (.xlsx/.xls) và trích các dòng { MaMon, MaHocPhan }.
// Bắt cột theo tiêu đề "Mã môn học" / "Mã lớp học phần" (không phân biệt hoa thường/dấu).
export const parseExcel = async (file) => {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []

  // defval '' để giữ đủ cột; raw false để số dài (mã HP) không bị đổi sang số mũ.
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })

  return json
    .map((r) => {
      const keys = Object.keys(r)
      const monKey = keys.find((k) => MA_MON_HEADERS.includes(norm(k)))
      const hpKey = keys.find((k) => MA_HP_HEADERS.includes(norm(k)))
      return {
        MaMon: String(r[monKey] ?? '').trim(),
        MaHocPhan: String(r[hpKey] ?? '').trim(),
      }
    })
    .filter((r) => r.MaMon && r.MaHocPhan)
}

// Gửi danh sách ánh xạ lên backend. Trả về { added, skipped, total }.
export const importRows = async (rows) => {
  const { data } = await http.post(ENDPOINTS.courseSubjects.import, { rows })
  return data
}

// Ánh xạ đã import: [{ id, maHocPhan, maMon, tenMon }]
export const list = async () => {
  const { data } = await http.get(ENDPOINTS.courseSubjects.list)
  return data.items || []
}

// Xóa 1 dòng ánh xạ.
export const remove = async (id) => {
  const { data } = await http.delete(ENDPOINTS.courseSubjects.remove(id))
  return data
}
