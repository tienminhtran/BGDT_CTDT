const { getPool, sql } = require('../config/db');
const model = require('../models/danhGiaBaiGiang.model');
const baiGiang = require('./baiGiang.service');
const svhp = require('./sinhVienHocPhan.service');

const TABLE = model.table;

/**
 * Helper: kiểm tra 1 sinh viên (MSSV) có quyền bình luận/đánh giá 1 bài giảng không.
 *
 * SV chỉ được đánh giá bài giảng của môn mình đang học. Đường nối:
 *   tb_BaiGiang -> ... -> tb_monhoc.ma_tuquan (maMon)
 *   rồi: MSSV -> tb_SinhVienHocPhan -> tb_HocPhanMonHoc -> maMon
 *
 * @returns {Promise<{ allowed: boolean, maMon: string, maHocPhan: string|null }>}
 */
async function kiemTraQuyenDanhGia(baiGiangId, mssv) {
  // getViTriBaiGiang ném 404 nếu không tìm thấy bài giảng
  const viTri = await baiGiang.getViTriBaiGiang(baiGiangId);
  const maMon = viTri.maTuQuan;
  const { allowed, maHocPhan } = await svhp.kiemTraSinhVienHocMon(mssv, maMon);
  return { allowed, maMon, maHocPhan };
}

// Lấy đánh giá của 1 SV cho 1 bài giảng (null nếu chưa có)
async function getDanhGiaCuaSinhVien(baiGiangId, mssv) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('bg', sql.Int, baiGiangId)
    .input('mssv', sql.NVarChar(20), mssv)
    .query(
      `SELECT Id, BaiGiangId, MSSV, SoSao, BinhLuan, NgayDanhGia
       FROM ${TABLE} WHERE BaiGiangId = @bg AND MSSV = @mssv`
    );
  return result.recordset[0] || null;
}

/**
 * Tạo mới 1 đánh giá (sao) + bình luận cho bài giảng.
 * - Kiểm tra SV thuộc môn của bài giảng (kiemTraQuyenDanhGia).
 * - Mỗi SV chỉ đánh giá 1 lần / bài giảng (UNIQUE BaiGiangId + MSSV).
 *
 * @returns {Promise<object>} bản ghi đánh giá vừa tạo
 */
async function taoDanhGia(baiGiangId, mssv, { soSao, binhLuan }) {
  const sao = parseInt(soSao, 10);
  if (!Number.isInteger(sao) || sao < 1 || sao > 5) {
    const err = new Error('Số sao phải từ 1 đến 5');
    err.status = 400;
    throw err;
  }

  const { allowed, maMon } = await kiemTraQuyenDanhGia(baiGiangId, mssv);
  if (!allowed) {
    const err = new Error(`Bạn không thuộc môn học (${maMon}) của bài giảng này`);
    err.status = 403;
    throw err;
  }

  const daCo = await getDanhGiaCuaSinhVien(baiGiangId, mssv);
  if (daCo) {
    const err = new Error('Bạn đã đánh giá bài giảng này rồi (dùng sửa để cập nhật)');
    err.status = 409;
    throw err;
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('bg', sql.Int, baiGiangId)
    .input('mssv', sql.NVarChar(20), mssv)
    .input('sao', sql.TinyInt, sao)
    .input('binhLuan', sql.NVarChar(255), binhLuan ?? null)
    .query(
      `INSERT INTO ${TABLE} (BaiGiangId, MSSV, SoSao, BinhLuan)
       OUTPUT INSERTED.Id, INSERTED.BaiGiangId, INSERTED.MSSV,
              INSERTED.SoSao, INSERTED.BinhLuan, INSERTED.NgayDanhGia
       VALUES (@bg, @mssv, @sao, @binhLuan)`
    );
  return result.recordset[0];
}

/**
 * Sửa đánh giá (sao) + bình luận của chính SV cho 1 bài giảng.
 * Chỉ cập nhật trường được truyền (soSao và/hoặc binhLuan).
 *
 * @returns {Promise<object>} bản ghi sau khi sửa
 */
async function suaDanhGia(baiGiangId, mssv, { soSao, binhLuan }) {
  const hienTai = await getDanhGiaCuaSinhVien(baiGiangId, mssv);
  if (!hienTai) {
    const err = new Error('Bạn chưa đánh giá bài giảng này');
    err.status = 404;
    throw err;
  }

  const coSao = soSao !== undefined && soSao !== null;
  const coBinhLuan = binhLuan !== undefined;
  if (!coSao && !coBinhLuan) {
    const err = new Error('Không có dữ liệu để cập nhật');
    err.status = 400;
    throw err;
  }

  let sao = hienTai.SoSao;
  if (coSao) {
    sao = parseInt(soSao, 10);
    if (!Number.isInteger(sao) || sao < 1 || sao > 5) {
      const err = new Error('Số sao phải từ 1 đến 5');
      err.status = 400;
      throw err;
    }
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, hienTai.Id)
    .input('sao', sql.TinyInt, sao)
    .input('binhLuan', sql.NVarChar(255), coBinhLuan ? binhLuan : hienTai.BinhLuan)
    .query(
      `UPDATE ${TABLE}
         SET SoSao = @sao, BinhLuan = @binhLuan, NgayDanhGia = GETDATE()
       OUTPUT INSERTED.Id, INSERTED.BaiGiangId, INSERTED.MSSV,
              INSERTED.SoSao, INSERTED.BinhLuan, INSERTED.NgayDanhGia
       WHERE Id = @id`
    );
  return result.recordset[0];
}

/**
 * Lấy danh sách bình luận/đánh giá của 1 bài giảng (mới nhất trước, phân trang)
 * kèm thống kê: tổng số, điểm trung bình, phân bố số sao.
 *
 * @param {number} baiGiangId
 * @param {{ page?: number, pageSize?: number }} opts
 */
async function getDanhGiaByBaiGiang(baiGiangId, { page = 1, pageSize = 20 } = {}) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const soDong = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const offset = (trang - 1) * soDong;

  const pool = await getPool();

  // Thống kê tổng hợp
  const thongKe = await pool
    .request()
    .input('bg', sql.Int, baiGiangId)
    .query(`
      SELECT
        COUNT(*) AS tongSo,
        AVG(CAST(SoSao AS DECIMAL(4,2))) AS diemTrungBinh,
        SUM(CASE WHEN SoSao = 1 THEN 1 ELSE 0 END) AS sao1,
        SUM(CASE WHEN SoSao = 2 THEN 1 ELSE 0 END) AS sao2,
        SUM(CASE WHEN SoSao = 3 THEN 1 ELSE 0 END) AS sao3,
        SUM(CASE WHEN SoSao = 4 THEN 1 ELSE 0 END) AS sao4,
        SUM(CASE WHEN SoSao = 5 THEN 1 ELSE 0 END) AS sao5
      FROM ${TABLE} WHERE BaiGiangId = @bg
    `);

  // Danh sách phân trang (mới nhất trước)
  const ds = await pool
    .request()
    .input('bg', sql.Int, baiGiangId)
    .input('offset', sql.Int, offset)
    .input('limit', sql.Int, soDong)
    .query(`
      SELECT Id, BaiGiangId, MSSV, SoSao, BinhLuan, NgayDanhGia
      FROM ${TABLE}
      WHERE BaiGiangId = @bg
      ORDER BY NgayDanhGia DESC, Id DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);

  const tk = thongKe.recordset[0];
  return {
    tongSoDanhGia: tk.tongSo,
    diemTrungBinh: tk.diemTrungBinh ? Number(tk.diemTrungBinh) : 0,
    phanBo: { 1: tk.sao1, 2: tk.sao2, 3: tk.sao3, 4: tk.sao4, 5: tk.sao5 },
    page: trang,
    pageSize: soDong,
    danhSach: ds.recordset,
  };
}

module.exports = {
  kiemTraQuyenDanhGia,
  getDanhGiaCuaSinhVien,
  taoDanhGia,
  suaDanhGia,
  getDanhGiaByBaiGiang,
};
