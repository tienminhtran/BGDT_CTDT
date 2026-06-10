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

// Map 1 dòng DB -> object trả ra API (field tiếng Anh)
function mapReview(r) {
  if (!r) return null;
  return {
    id: r.Id,
    lectureId: r.BaiGiangId,
    studentId: r.MSSV,
    stars: r.SoSao,
    comment: r.BinhLuan,
    createdAt: r.NgayDanhGia,
  };
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
  return mapReview(result.recordset[0]);
}

/**
 * Tạo mới 1 đánh giá (sao) + bình luận cho bài giảng.
 * - Kiểm tra SV thuộc môn của bài giảng (kiemTraQuyenDanhGia).
 * - Mỗi SV chỉ đánh giá 1 lần / bài giảng (UNIQUE BaiGiangId + MSSV).
 *
 * @returns {Promise<object>} bản ghi đánh giá vừa tạo
 */
async function taoDanhGia(baiGiangId, mssv, { stars, comment }) {
  const sao = parseInt(stars, 10);
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
    .input('binhLuan', sql.NVarChar(255), comment ?? null)
    .query(
      `INSERT INTO ${TABLE} (BaiGiangId, MSSV, SoSao, BinhLuan)
       OUTPUT INSERTED.Id, INSERTED.BaiGiangId, INSERTED.MSSV,
              INSERTED.SoSao, INSERTED.BinhLuan, INSERTED.NgayDanhGia
       VALUES (@bg, @mssv, @sao, @binhLuan)`
    );
  return mapReview(result.recordset[0]);
}

/**
 * Sửa đánh giá (sao) + bình luận của chính SV cho 1 bài giảng.
 * Chỉ cập nhật trường được truyền (soSao và/hoặc binhLuan).
 *
 * @returns {Promise<object>} bản ghi sau khi sửa
 */
async function suaDanhGia(baiGiangId, mssv, { stars, comment }) {
  const hienTai = await getDanhGiaCuaSinhVien(baiGiangId, mssv);
  if (!hienTai) {
    const err = new Error('Bạn chưa đánh giá bài giảng này');
    err.status = 404;
    throw err;
  }

  const coSao = stars !== undefined && stars !== null;
  const coBinhLuan = comment !== undefined;
  if (!coSao && !coBinhLuan) {
    const err = new Error('Không có dữ liệu để cập nhật');
    err.status = 400;
    throw err;
  }

  let sao = hienTai.stars;
  if (coSao) {
    sao = parseInt(stars, 10);
    if (!Number.isInteger(sao) || sao < 1 || sao > 5) {
      const err = new Error('Số sao phải từ 1 đến 5');
      err.status = 400;
      throw err;
    }
  }

  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, hienTai.id)
    .input('sao', sql.TinyInt, sao)
    .input('binhLuan', sql.NVarChar(255), coBinhLuan ? comment : hienTai.comment)
    .query(
      `UPDATE ${TABLE}
         SET SoSao = @sao, BinhLuan = @binhLuan, NgayDanhGia = GETDATE()
       OUTPUT INSERTED.Id, INSERTED.BaiGiangId, INSERTED.MSSV,
              INSERTED.SoSao, INSERTED.BinhLuan, INSERTED.NgayDanhGia
       WHERE Id = @id`
    );
  return mapReview(result.recordset[0]);
}

/**
 * Thống kê đánh giá tổng hợp của 1 bài giảng: tổng số lượt, điểm trung bình,
 * phân bố số sao. KHÔNG trả danh sách bình luận của từng SV (không lộ MSSV/bình
 * luận của người khác) — UI chỉ cần điểm trung bình để hiển thị.
 *
 * @param {number} baiGiangId
 */
async function getThongKeDanhGia(baiGiangId) {
  const pool = await getPool();

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

  const tk = thongKe.recordset[0];
  return {
    total: tk.tongSo,
    average: tk.diemTrungBinh ? Number(tk.diemTrungBinh) : 0,
    distribution: { 1: tk.sao1, 2: tk.sao2, 3: tk.sao3, 4: tk.sao4, 5: tk.sao5 },
  };
}

module.exports = {
  kiemTraQuyenDanhGia,
  getDanhGiaCuaSinhVien,
  taoDanhGia,
  suaDanhGia,
  getThongKeDanhGia,
};
