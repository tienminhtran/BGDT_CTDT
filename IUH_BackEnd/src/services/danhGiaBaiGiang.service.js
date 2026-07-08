const { fn, col, literal, Op } = require('sequelize');
const {
  DanhGiaBaiGiang,
  BaiGiang,
  ChiTietDangKyBaiGiang,
  DangKyBaiGiang,
  MonhocVersion,
  Monhoc,
} = require('../models/orm');
const baiGiang = require('./baiGiang.service');
const svhp = require('./sinhVienHocPhan.service');

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

// Map 1 bản ghi (Sequelize instance hoặc plain) -> object trả ra API (field tiếng Anh)
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
  const row = await DanhGiaBaiGiang.findOne({
    attributes: ['Id', 'BaiGiangId', 'MSSV', 'SoSao', 'BinhLuan', 'NgayDanhGia'],
    where: { BaiGiangId: baiGiangId, MSSV: mssv },
  });
  return mapReview(row);
}

/**
 * Lấy TẤT CẢ đánh giá của 1 SV (mọi bài giảng), kèm tên môn + tên bài giảng để hiển thị.
 * Đường nối enrich: DanhGiaBaiGiang -> BaiGiang -> ChiTiet -> DangKy -> MonHocVersion -> Monhoc.
 * Sắp xếp mới nhất trước. Trả mảng (rỗng nếu SV chưa đánh giá gì).
 *
 * @param {string} mssv
 * @returns {Promise<Array<object>>}
 */
async function getDanhSachDanhGiaCuaSinhVien(mssv) {
  const rows = await DanhGiaBaiGiang.findAll({
    where: { MSSV: mssv },
    attributes: ['Id', 'BaiGiangId', 'MSSV', 'SoSao', 'BinhLuan', 'NgayDanhGia'],
    order: [['NgayDanhGia', 'DESC']],
    include: [
      {
        model: BaiGiang,
        as: 'BaiGiang',
        attributes: ['Id', 'TenBaiGiang'],
        required: false,
        include: [
          {
            model: ChiTietDangKyBaiGiang,
            as: 'ChiTiet',
            attributes: ['Id'],
            required: false,
            include: [
              {
                model: DangKyBaiGiang,
                as: 'DangKy',
                attributes: ['Id'],
                required: false,
                include: [
                  {
                    model: MonhocVersion,
                    as: 'MonHocVersion',
                    attributes: ['version'],
                    required: false,
                    include: [
                      {
                        model: Monhoc,
                        as: 'Monhoc',
                        attributes: ['ma_tuquan', 'tenmon'],
                        required: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  // Thống kê tổng hợp (tổng lượt + điểm TB) cho các bài giảng SV đã đánh giá, gộp 1 query
  // theo BaiGiangId -> tránh FE phải gọi GET /reviews/:lectureId cho từng bài giảng (N+1).
  const lectureIds = [...new Set(rows.map((r) => r.BaiGiangId))];
  const statsMap = {};
  if (lectureIds.length) {
    const stats = await DanhGiaBaiGiang.findAll({
      where: { BaiGiangId: { [Op.in]: lectureIds } },
      attributes: [
        'BaiGiangId',
        [fn('COUNT', col('Id')), 'total'],
        [fn('AVG', literal('CAST(SoSao AS DECIMAL(4,2))')), 'average'],
      ],
      group: ['BaiGiangId'],
      raw: true,
    });
    for (const s of stats) {
      statsMap[s.BaiGiangId] = {
        total: Number(s.total) || 0,
        average: s.average ? Number(s.average) : 0,
      };
    }
  }

  return rows.map((r) => {
    const monHocVersion = r.BaiGiang?.ChiTiet?.DangKy?.MonHocVersion;
    const monhoc = monHocVersion?.Monhoc;
    const tk = statsMap[r.BaiGiangId] || { total: 0, average: 0 };
    return {
      ...mapReview(r),
      courseCode: monhoc?.ma_tuquan ?? null,
      courseName: monhoc?.tenmon ?? null,
      version: monHocVersion?.version ?? null, // cần để FE tạo token mờ mở trang xem bài giảng
      videoTitle: r.BaiGiang?.TenBaiGiang ?? null,
      total: tk.total,
      average: tk.average,
    };
  });
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

  // Không set NgayDanhGia -> DB tự điền GETDATE(); reload để lấy giá trị vừa sinh.
  const created = await DanhGiaBaiGiang.create({
    BaiGiangId: baiGiangId,
    MSSV: mssv,
    SoSao: sao,
    BinhLuan: comment ?? null,
  });
  await created.reload();
  return mapReview(created);
}

/**
 * Sửa đánh giá (sao) + bình luận của chính SV cho 1 bài giảng.
 * Chỉ cập nhật trường được truyền (soSao và/hoặc binhLuan).
 *
 * @returns {Promise<object>} bản ghi sau khi sửa
 */
async function suaDanhGia(baiGiangId, mssv, { stars, comment }) {
  const hienTai = await DanhGiaBaiGiang.findOne({
    where: { BaiGiangId: baiGiangId, MSSV: mssv },
  });
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

  let sao = hienTai.SoSao;
  if (coSao) {
    sao = parseInt(stars, 10);
    if (!Number.isInteger(sao) || sao < 1 || sao > 5) {
      const err = new Error('Số sao phải từ 1 đến 5');
      err.status = 400;
      throw err;
    }
  }

  await hienTai.update({
    SoSao: sao,
    BinhLuan: coBinhLuan ? comment : hienTai.BinhLuan,
    NgayDanhGia: fn('GETDATE'),
  });
  await hienTai.reload(); // lấy lại NgayDanhGia (GETDATE) từ DB
  return mapReview(hienTai);
}

/**
 * Thống kê đánh giá tổng hợp của 1 bài giảng: tổng số lượt, điểm trung bình,
 * phân bố số sao. KHÔNG trả danh sách bình luận của từng SV (không lộ MSSV/bình
 * luận của người khác) — UI chỉ cần điểm trung bình để hiển thị.
 *
 * @param {number} baiGiangId
 */
async function getThongKeDanhGia(baiGiangId) {
  // Dùng findAll (không limit) để tránh SQL Server tự thêm ORDER BY Id
  // -> xung đột với query tổng hợp (không có GROUP BY). Query này luôn trả đúng 1 dòng.
  const rows = await DanhGiaBaiGiang.findAll({
    where: { BaiGiangId: baiGiangId },
    attributes: [
      [fn('COUNT', col('Id')), 'tongSo'],
      [fn('AVG', literal('CAST(SoSao AS DECIMAL(4,2))')), 'diemTrungBinh'],
      [fn('SUM', literal('CASE WHEN SoSao = 1 THEN 1 ELSE 0 END')), 'sao1'],
      [fn('SUM', literal('CASE WHEN SoSao = 2 THEN 1 ELSE 0 END')), 'sao2'],
      [fn('SUM', literal('CASE WHEN SoSao = 3 THEN 1 ELSE 0 END')), 'sao3'],
      [fn('SUM', literal('CASE WHEN SoSao = 4 THEN 1 ELSE 0 END')), 'sao4'],
      [fn('SUM', literal('CASE WHEN SoSao = 5 THEN 1 ELSE 0 END')), 'sao5'],
    ],
    raw: true,
  });
  const tk = rows[0];

  // Lượt xem lấy từ chính bản ghi bài giảng (tb_BaiGiang.LuotXem), độc lập với đánh giá.
  const bg = await BaiGiang.findByPk(baiGiangId, { attributes: ['LuotXem'], raw: true });

  return {
    total: tk.tongSo,
    average: tk.diemTrungBinh ? Number(tk.diemTrungBinh) : 0,
    views: bg?.LuotXem ?? 0,
    distribution: { 1: tk.sao1, 2: tk.sao2, 3: tk.sao3, 4: tk.sao4, 5: tk.sao5 },
  };
}

module.exports = {
  kiemTraQuyenDanhGia,
  getDanhGiaCuaSinhVien,
  getDanhSachDanhGiaCuaSinhVien,
  taoDanhGia,
  suaDanhGia,
  getThongKeDanhGia,
};
