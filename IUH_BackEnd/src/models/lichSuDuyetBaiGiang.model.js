const { sql } = require('../config/db');

const LichSuDuyetBaiGiang = {
  table: 'tb_LichSuDuyetBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    // Loại đối tượng được duyệt: 'DangKy' | 'ChiTietDangKy' | 'BaiGiang' ...
    LoaiDuyet: { type: sql.VarChar(50), nullable: false },
    TargetId: { type: sql.Int, nullable: false },
    // Cấp duyệt: 'BoMon' | 'LanhDaoKhoa' | 'Admin'
    CapDuyet: { type: sql.VarChar(20), nullable: false },
    TrangThaiDuyet: { type: sql.Bit, nullable: false },
    MaNguoiDuyet: { type: sql.VarChar(50), nullable: false },
    NgayDuyet: { type: sql.DateTime, nullable: false },
    GhiChu: { type: sql.NVarChar(sql.MAX), nullable: true },
    ChuKyHash: { type: sql.VarChar(500), nullable: false },
  },
};

module.exports = LichSuDuyetBaiGiang;
