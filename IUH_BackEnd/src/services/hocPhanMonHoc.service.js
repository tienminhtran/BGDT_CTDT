const { Op } = require('sequelize');
const { HocPhanMonHoc, Monhoc, MonhocVersion } = require('../models/orm');

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

/**
 * Toàn bộ ánh xạ học phần <-> môn học đã import, kèm TÊN môn (tb_monhoc) và
 * danh sách PHIÊN BẢN của môn (tb_monhoc_version) để FE mở rộng dòng xem chi tiết.
 *
 * Ghép bằng 3 query rồi map trong JS (MaMon <-> tb_monhoc.ma_tuquan không phải
 * khóa ngoại nên không khai báo association).
 *
 * @returns {Promise<Array<{ id, maHocPhan, maMon, tenMon, versions: Array<{id, version}> }>>}
 */
async function danhSachAnhXa() {
  const tatCa = await HocPhanMonHoc.findAll({
    attributes: ['id', 'MaHocPhan', 'MaMon'],
    order: [
      ['MaHocPhan', 'ASC'],
      ['MaMon', 'ASC'],
      ['id', 'ASC'],
    ],
    raw: true,
  });

  // Dữ liệu cũ có thể có nhiều dòng cùng (MaHocPhan, MaMon) -> chỉ giữ 1 (id nhỏ nhất).
  const theoCap = new Map();
  for (const r of tatCa) {
    if (!theoCap.has(keyOf(r))) theoCap.set(keyOf(r), r);
  }
  const rows = [...theoCap.values()];

  const monHoc = await Monhoc.findAll({
    attributes: ['id', 'ma_tuquan', 'tenmon'],
    where: { ma_tuquan: { [Op.in]: [...new Set(rows.map((r) => r.MaMon))] } },
    raw: true,
  });

  const versions = await MonhocVersion.findAll({
    attributes: ['id', 'id_monhoc', 'version'],
    where: { id_monhoc: { [Op.in]: monHoc.map((m) => m.id) } },
    order: [['version', 'ASC']],
    raw: true,
  });

  // id môn -> [{ id, version }]
  const versionTheoMon = new Map();
  for (const v of versions) {
    const ds = versionTheoMon.get(String(v.id_monhoc)) ?? [];
    ds.push({ id: v.id, version: v.version });
    versionTheoMon.set(String(v.id_monhoc), ds);
  }

  const monTheoMa = new Map(monHoc.map((m) => [m.ma_tuquan, m]));

  return rows.map((r) => {
    const mon = monTheoMa.get(r.MaMon);
    return {
      id: r.id,
      maHocPhan: r.MaHocPhan,
      maMon: r.MaMon,
      // Môn có trong ánh xạ nhưng chưa có trong tb_monhoc -> null, FE hiện cảnh báo.
      tenMon: mon?.tenmon ?? null,
      versions: mon ? (versionTheoMon.get(String(mon.id)) ?? []) : [],
    };
  });
}

/**
 * Xóa 1 ánh xạ theo id. Vì danh sách đã gộp trùng, xóa phải quét theo CẶP
 * (MaHocPhan, MaMon) — nếu chỉ xóa đúng id thì các dòng trùng còn lại vẫn hiện.
 *
 * @returns {Promise<number>} số dòng đã xóa (0 = không tìm thấy)
 */
async function xoaAnhXa(id) {
  const row = await HocPhanMonHoc.findByPk(id, { attributes: ['MaHocPhan', 'MaMon'] });
  if (!row) return 0;

  return HocPhanMonHoc.destroy({
    where: { MaHocPhan: row.MaHocPhan, MaMon: row.MaMon },
  });
}

module.exports = { importHocPhanMonHoc, danhSachAnhXa, xoaAnhXa };
