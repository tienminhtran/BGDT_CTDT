const { Op } = require('sequelize');
const { HocPhanMonHoc } = require('../models/orm');

// Khóa duy nhất cho 1 ánh xạ (học phần <-> môn) để dò trùng.
const keyOf = (r) => `${r.MaHocPhan}|${r.MaMon}`;

// Chuẩn hóa 1 dòng import về { MaMon, MaHocPhan } (trim chuỗi).
function normalizeRow(row) {
  return {
    MaMon: String(row?.MaMon ?? '').trim(),
    MaHocPhan: String(row?.MaHocPhan ?? '').trim(),
  };
}

/**
 * Import danh sách ánh xạ học phần -> môn học vào tb_HocPhanMonHoc.
 * Chỉ thêm cặp (MaHocPhan, MaMon) chưa tồn tại; bỏ qua dòng thiếu hoặc trùng.
 *
 * @param {Array<{ MaMon: string, MaHocPhan: string }>} rows
 * @returns {Promise<{ added: number, skipped: number, total: number }>}
 */
async function importHocPhanMonHoc(rows) {
  const cleaned = (rows || [])
    .map(normalizeRow)
    .filter((r) => r.MaMon && r.MaHocPhan);

  // Bỏ trùng ngay trong file (cùng cặp MaHocPhan|MaMon).
  const uniqueMap = new Map();
  for (const r of cleaned) uniqueMap.set(keyOf(r), r);
  const list = [...uniqueMap.values()];

  if (!list.length) return { added: 0, skipped: 0, total: 0 };

  // Lấy các cặp đã có trong DB (lọc theo MaHocPhan xuất hiện trong file) để không insert trùng.
  const maHocPhanList = [...new Set(list.map((r) => r.MaHocPhan))];
  const existingRows = await HocPhanMonHoc.findAll({
    attributes: ['MaHocPhan', 'MaMon'],
    where: { MaHocPhan: { [Op.in]: maHocPhanList } },
  });
  const existing = new Set(existingRows.map(keyOf));

  const toAdd = list.filter((r) => !existing.has(keyOf(r)));
  if (toAdd.length) {
    await HocPhanMonHoc.bulkCreate(toAdd);
  }

  return {
    added: toAdd.length,
    skipped: list.length - toAdd.length,
    total: list.length,
  };
}

module.exports = { importHocPhanMonHoc };
