const { sql } = require('../config/db');

const DangKyBaiGiang = {
  table: 'tb_DangKyBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    DotBaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_DotBaiGiang', column: 'Id' },
    },
    MonHocVersionId: { type: sql.Int, nullable: false },
    SoLuongVideo: { type: sql.Int, nullable: true, default: 0 },
    DaKhoa: { type: sql.Bit, nullable: true, default: 0 },
    NguoiDangKyId: { type: sql.Int, nullable: false },
    TrangThaiDuyet: { type: sql.Bit, nullable: true },
    MaNguoiDuyet: { type: sql.VarChar(50), nullable: true },
    NgayDuyet: { type: sql.DateTime, nullable: true },
    GhiChuDuyet: { type: sql.NVarChar(sql.MAX), nullable: true },

  },
};

module.exports = DangKyBaiGiang;
