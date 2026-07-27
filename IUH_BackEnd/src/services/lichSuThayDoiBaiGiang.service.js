const { fn } = require('sequelize');
const {
  LichSuThayDoiBaiGiang,
  BaiGiang,
  ChiTietDangKyBaiGiang,
  DangKyBaiGiang,
  MonhocVersion,
  Monhoc,
} = require('../models/orm');

/**
 * Nhật ký thao tác trên bài giảng (tb_LichSuThayDoiBaiGiang).
 * Mỗi thao tác tạo/sửa/xóa video ghi 1 dòng: ai làm (mã người do UI truyền xuống),
 * lúc nào (giờ DB), lý do và IP thật của client.
 */

// Ánh xạ hành động -> bộ cột tương ứng trong bảng (mỗi hành động dùng 1 cột ngày/người/lý do).
const COT = {
  tao: { ngay: 'NgayTao', nguoi: 'MaNguoiTao', lyDo: null },
  sua: { ngay: 'NgaySua', nguoi: 'MaNguoiSua', lyDo: 'LyDoSua' },
  xoa: { ngay: 'NgayXoa', nguoi: 'MaNguoiXoa', lyDo: 'LyDoXoa' },
};

// Lấy IP thật của client (app.js đã bật trust proxy để đọc X-Forwarded-For sau nginx).
// Cột DiaChiIP là VARCHAR(45) -> vừa đủ 1 địa chỉ IPv6 đầy đủ, cắt bớt cho chắc.
function layIp(req) {
  if (!req) return null;
  const ip = req.ip || req.socket?.remoteAddress;
  if (!ip) return null;
  return String(ip).replace(/^::ffff:/, '').slice(0, 45); // bỏ tiền tố IPv4-mapped
}

/**
 * Ghi 1 dòng nhật ký cho bài giảng.
 *
 * Dùng khi TẠO (upload video) và khi XÓA video:
 *   await ghiLichSu(idBaiGiang, 'tao', { maNguoi: req.body.maNguoiTao, req });
 *   await ghiLichSu(idBaiGiang, 'xoa', { maNguoi: req.body.maNguoiXoa, lyDo, req });
 *
 * `maNguoi` do UI truyền xuống (mã giảng viên đang đăng nhập app 5999); `DiaChiIP`
 * lấy từ `req` — hoặc truyền thẳng `diaChiIP` nếu chỗ gọi không có `req`.
 *
 * KHÔNG ném lỗi: đây là nhật ký phụ trợ, hỏng ghi log thì thao tác chính (upload/xóa
 * video đã thành công) vẫn phải trả 200 cho client. Lỗi được in ra console để soi lại.
 *
 * @param {number} idBaiGiang           tb_BaiGiang.Id
 * @param {'tao'|'sua'|'xoa'} hanhDong
 * @param {object} [opts]
 * @param {string} [opts.maNguoi]  mã người thao tác (UI truyền xuống)
 * @param {string} [opts.lyDo]     lý do sửa/xóa (bỏ qua với hành động 'tao')
 * @param {object} [opts.req]      request Express — để lấy IP
 * @param {string} [opts.diaChiIP] IP truyền thẳng (ưu tiên hơn `req`)
 * @returns {Promise<object|null>} bản ghi vừa tạo, null nếu ghi hụt
 */
async function ghiLichSu(idBaiGiang, hanhDong, { maNguoi, lyDo, req, diaChiIP } = {}) {
  const cot = COT[hanhDong];
  if (!cot) return null;

  try {
    const duLieu = {
      IdBaiGiang: Number.isInteger(idBaiGiang) ? idBaiGiang : parseInt(idBaiGiang, 10) || null,
      [cot.ngay]: fn('GETDATE'), // giờ theo đồng hồ SQL Server, không phụ thuộc giờ máy Node
      [cot.nguoi]: maNguoi ? String(maNguoi).trim().slice(0, 50) : null,
      DiaChiIP: diaChiIP ? String(diaChiIP).slice(0, 45) : layIp(req),
    };
    if (cot.lyDo && lyDo) duLieu[cot.lyDo] = String(lyDo).slice(0, 500);

    return await LichSuThayDoiBaiGiang.create(duLieu);
  } catch (err) {
    console.error('[lichSuThayDoiBaiGiang] ghi nhật ký thất bại:', err.message);
    return null;
  }
}

// Map 1 dòng nhật ký -> object trả ra API. `hanhDong` suy ra từ cột ngày nào có giá trị
// (mỗi dòng chỉ ghi 1 thao tác) -> FE khỏi phải tự đoán khi hiển thị bảng.
function mapLichSu(r) {
  if (!r) return null;
  const hanhDong = r.NgayXoa ? 'xoa' : r.NgaySua ? 'sua' : r.NgayTao ? 'tao' : null;
  return {
    id: r.Id,
    idBaiGiang: r.IdBaiGiang,
    hanhDong,
    thoiGian: r.NgayXoa ?? r.NgaySua ?? r.NgayTao ?? null,
    maNguoi: r.MaNguoiXoa ?? r.MaNguoiSua ?? r.MaNguoiTao ?? null,
    lyDo: r.LyDoXoa ?? r.LyDoSua ?? null,
    diaChiIP: r.DiaChiIP,
    ngayTao: r.NgayTao,
    ngaySua: r.NgaySua,
    ngayXoa: r.NgayXoa,
    maNguoiTao: r.MaNguoiTao,
    maNguoiSua: r.MaNguoiSua,
    maNguoiXoa: r.MaNguoiXoa,
  };
}

/**
 * Nhật ký của 1 bài giảng, mới nhất trước.
 * Không có cột thời gian chung nên sắp theo Id DESC (IDENTITY tăng dần = thứ tự ghi).
 *
 * @param {number|string} idBaiGiang
 * @returns {Promise<Array<object>>}
 */
async function danhSachTheoBaiGiang(idBaiGiang) {
  const rows = await LichSuThayDoiBaiGiang.findAll({
    where: { IdBaiGiang: idBaiGiang },
    order: [['Id', 'DESC']],
    raw: true,
  });
  return rows.map(mapLichSu);
}

// Include enrich: LichSu -> BaiGiang -> ChiTiet -> DangKy -> MonHocVersion -> Monhoc.
// required: false ở mọi tầng -> dòng nhật ký của bài giảng đã xóa vẫn hiện (cột môn để null).
const INCLUDE_MON = [
  {
    model: BaiGiang,
    as: 'BaiGiang',
    attributes: ['Id', 'TenBaiGiang'],
    required: false,
    include: [
      {
        model: ChiTietDangKyBaiGiang,
        as: 'ChiTiet',
        attributes: ['Id', 'NoiDungChuong'],
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
];

// Thêm thông tin bài giảng/môn học vào 1 dòng nhật ký (dùng cho màn quản lý).
function themThongTinMon(r) {
  const monHocVersion = r.BaiGiang?.ChiTiet?.DangKy?.MonHocVersion;
  const monhoc = monHocVersion?.Monhoc;
  return {
    ...mapLichSu(r),
    tenBaiGiang: r.BaiGiang?.TenBaiGiang ?? null,
    noiDungChuong: r.BaiGiang?.ChiTiet?.NoiDungChuong ?? null,
    maTuQuan: monhoc?.ma_tuquan ?? null,
    tenMon: monhoc?.tenmon ?? null,
    version: monHocVersion?.version ?? null,
  };
}

/**
 * Toàn bộ nhật ký (mọi bài giảng), mới nhất trước, kèm tên bài giảng + môn/phiên bản
 * để màn "Lịch sử thay đổi" đổ thẳng ra bảng và tự lọc phía client.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit] số dòng tối đa (mặc định 500) — chặn tải quá tay khi log lớn dần
 * @returns {Promise<Array<object>>}
 */
async function danhSachTatCa({ limit } = {}) {
  const rows = await LichSuThayDoiBaiGiang.findAll({
    order: [['Id', 'DESC']],
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 2000) : 500,
    include: INCLUDE_MON,
  });
  return rows.map(themThongTinMon);
}

module.exports = { ghiLichSu, danhSachTatCa, danhSachTheoBaiGiang, layIp };
