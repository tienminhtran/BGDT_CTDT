const { sql } = require('../config/db');

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
  },
};

module.exports = BaiGiang;
