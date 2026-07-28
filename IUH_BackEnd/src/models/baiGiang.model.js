const { sql } = require('../config/db');

// Trạng thái xử lý (chunk hóa) video của bài giảng.
// Khớp CHECK constraint CK_tb_BaiGiang_TrangThaiXuLyChunk (sql/05_them_cot_xu_ly_chunk.sql).
const TRANG_THAI_XU_LY_CHUNK = {
  CHUA_XU_LY: 'ChuaXuLy',
  DANG_CHO: 'DangCho',
  DANG_XU_LY: 'DangXuLy',
  HOAN_THANH: 'HoanThanh',
  THAT_BAI: 'ThatBai',
};

const BaiGiang = {
  table: 'tb_BaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    ChiTietDangKyBaiGiangId: {
      type: sql.Int,
      nullable: false,
      unique: true,
      references: { table: 'tb_ChiTietDangKyBaiGiang', column: 'Id' },
    },
    TenBaiGiang: { type: sql.NVarChar(255), nullable: true },
    NoiDungBaiGiang: { type: sql.NVarChar(sql.MAX), nullable: true },
    LinkBaiGiang: { type: sql.VarChar(500), nullable: true },
    TongDiemSo: { type: sql.Decimal(5, 2), nullable: true, default: 0.0 },
    DatNguongDiem: { type: sql.Bit, nullable: true, default: 1 },
    DaKhoa: { type: sql.Bit, nullable: true, default: 0 },
    // Cấp duyệt: Bộ môn
    BoMonDuyet: { type: sql.Bit, nullable: true },
    MaNguoiDuyetBM: { type: sql.VarChar(50), nullable: true },
    NgayDuyetBM: { type: sql.DateTime, nullable: true },
    GhiChuBM: { type: sql.NVarChar(sql.MAX), nullable: true },
    MaChuKyHashBM: { type: sql.VarChar(500), nullable: true },
    // Cấp duyệt: Lãnh đạo khoa
    LanhDaoKhoaDuyet: { type: sql.Bit, nullable: true },
    MaNguoiDuyetLDK: { type: sql.VarChar(50), nullable: true },
    NgayDuyetLDK: { type: sql.DateTime, nullable: true },
    GhiChuLDK: { type: sql.NVarChar(sql.MAX), nullable: true },
    MaChuKyHashLDK: { type: sql.VarChar(500), nullable: true },
    LinkChunkBaiGiang: { type: sql.VarChar(sql.MAX), nullable: true },
    LuotXem: { type: sql.Int, nullable: true, default: 0 },

    
    // Tiến trình xử lý (chunk hóa) video - xem sql/05_them_cot_xu_ly_chunk.sql
    TrangThaiXuLyChunk: {
      type: sql.NVarChar(20),
      nullable: false,
      default: TRANG_THAI_XU_LY_CHUNK.CHUA_XU_LY,
      enum: Object.values(TRANG_THAI_XU_LY_CHUNK),
    },
    DanhSachChunk: { type: sql.NVarChar(sql.MAX), nullable: true }, // JSON array toàn bộ chunk
    ThoiLuongGiay: { type: sql.Float, nullable: true }, // tổng thời lượng video
    NgayBatDauXuLy: { type: sql.DateTime2, nullable: true },
    NgayHoanThanhXuLy: { type: sql.DateTime2, nullable: true },
    LoiXuLy: { type: sql.NVarChar(sql.MAX), nullable: true },
    SoLanThuLai: { type: sql.Int, nullable: false, default: 0 },
    NgayThuLaiSauKhi: { type: sql.DateTime2, nullable: true }, // mốc sớm nhất được bốc lại (backoff)
    MaJobXuLy: { type: sql.NVarChar(100), nullable: true }, // id lượt chạy worker, để đối chiếu log
  },
};

BaiGiang.TRANG_THAI_XU_LY_CHUNK = TRANG_THAI_XU_LY_CHUNK;

module.exports = BaiGiang;
