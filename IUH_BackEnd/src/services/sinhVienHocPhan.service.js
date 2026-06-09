const { getPool, sql } = require('../config/db');
const model = require('../models/sinhVienHocPhan.model');

const TABLE = model.table;

/**
 * Cắt bỏ 2 ký tự cuối của mã học phần.
 *
 * idnumber lấy từ LMS có 2 số đuôi (vd đợt/lần mở lớp) không thuộc MaHocPhan gốc,
 * nên khi lưu vào DB và khi đối chiếu với tb_HocPhanMonHoc đều phải cắt đi cho khớp.
 * Vd: '420300111104' -> '4203001111'. Mã rỗng hoặc <= 2 ký tự thì giữ nguyên.
 */
function catHaiSoCuoi(ma) {
  const s = String(ma ?? '').trim();
  return s.length > 2 ? s.slice(0, -2) : s;
}

// Lấy danh sách MaHocPhan (idnumber) của 1 sinh viên theo MSSV
async function getHocPhanByMssv(mssv) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('MaSinhVien', sql.NVarChar(20), mssv)
    .query(`SELECT MaHocPhan FROM ${TABLE} WHERE MaSinhVien = @MaSinhVien`);
  return result.recordset.map((r) => r.MaHocPhan);
}

// Import danh sách idnumber cho SV: chỉ thêm những học phần SV chưa có.
// Mỗi idnumber được cắt 2 số cuối trước khi lưu (xem catHaiSoCuoi).
async function importHocPhan(mssv, idnumbers) {
  const list = [...new Set((idnumbers || []).map(catHaiSoCuoi).filter(Boolean))];
  if (!list.length) return { added: 0, skipped: 0, total: 0 };

  const existing = new Set(await getHocPhanByMssv(mssv));
  const toAdd = list.filter((x) => !existing.has(x));

  const pool = await getPool();
  for (const maHocPhan of toAdd) {
    await pool
      .request()
      .input('MaSinhVien', sql.NVarChar(20), mssv)
      .input('MaHocPhan', sql.NVarChar(20), maHocPhan)
      .query(
        `INSERT INTO ${TABLE} (MaSinhVien, MaHocPhan) VALUES (@MaSinhVien, @MaHocPhan)`
      );
  }

  return { added: toAdd.length, skipped: list.length - toAdd.length, total: list.length };
}

/**
 * Kiểm tra 1 sinh viên có được học môn (MaMon) hay không.
 *
 * Điều kiện: SV phải thuộc một học phần (tb_SinhVienHocPhan) và học phần đó
 * có chứa đúng môn cần học (tb_HocPhanMonHoc). Tức là tồn tại đường nối:
 *   MaSinhVien -> MaHocPhan -> MaMon
 *
 * @returns {Promise<{ allowed: boolean, maHocPhan: string | null }>}
 *   allowed: SV có quyền học môn này; maHocPhan: học phần khớp đầu tiên (nếu có).
 */
async function kiemTraSinhVienHocMon(mssv, maMon) {
  if (!mssv || !maMon) return { allowed: false, maHocPhan: null };

  const pool = await getPool();
  const result = await pool
    .request()
    .input('MaSinhVien', sql.NVarChar(20), mssv)
    .input('MaMon', sql.NVarChar(20), maMon)
    .query(`
      SELECT TOP 1 hpm.MaHocPhan
      FROM tb_SinhVienHocPhan svhp
      INNER JOIN tb_HocPhanMonHoc hpm
        ON hpm.MaHocPhan = svhp.MaHocPhan
      WHERE svhp.MaSinhVien = @MaSinhVien
        AND hpm.MaMon = @MaMon
    `);

  const maHocPhan = result.recordset[0]?.MaHocPhan ?? null;
  return { allowed: maHocPhan != null, maHocPhan };
}

/**
 * Tra map MaHocPhan -> [MaMon] cho 1 danh sách học phần (1 query gộp).
 * Dùng để gắn MaMon vào danh sách khóa học (idnumber = MaHocPhan) trả cho FE.
 *
 * @param {string[]} maHocPhanList
 * @returns {Promise<Record<string, string[]>>}
 */
async function getMonHocByHocPhan(maHocPhanList) {
  const list = [...new Set((maHocPhanList || []).map(catHaiSoCuoi).filter(Boolean))];
  if (!list.length) return {};

  const pool = await getPool();
  const request = pool.request();
  const params = list.map((value, i) => {
    request.input(`hp${i}`, sql.NVarChar(20), value);
    return `@hp${i}`;
  });

  const result = await request.query(
    `SELECT MaHocPhan, MaMon FROM tb_HocPhanMonHoc WHERE MaHocPhan IN (${params.join(',')})`
  );

  const map = {};
  for (const row of result.recordset) {
    (map[row.MaHocPhan] ??= []).push(row.MaMon);
  }
  return map;
}

module.exports = {
  catHaiSoCuoi,
  getHocPhanByMssv,
  importHocPhan,
  kiemTraSinhVienHocMon,
  getMonHocByHocPhan,
};
