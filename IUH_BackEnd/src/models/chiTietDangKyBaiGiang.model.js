const { sql } = require('../config/db');

const ChiTietDangKyBaiGiang = {
  table: 'tb_ChiTietDangKyBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    DangKyBaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_DangKyBaiGiang', column: 'Id', onDelete: 'CASCADE' },
    },
    NoiDungChuong: { type: sql.NVarChar(100), nullable: false },
    GhiChu: { type: sql.NVarChar(sql.MAX), nullable: true },
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
    // Cấp duyệt: Admin
    TrangThaiDuyet: { type: sql.Bit, nullable: true },
    MaNguoiDuyetAdmin: { type: sql.VarChar(50), nullable: true },
    NgayDuyetAdmin: { type: sql.DateTime, nullable: true },
    GhiChuAdmin: { type: sql.NVarChar(sql.MAX), nullable: true },
    MaChuKyHashAdmin: { type: sql.VarChar(500), nullable: true },
  },
};

module.exports = ChiTietDangKyBaiGiang;
