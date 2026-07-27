const { sql } = require('../config/db');

// Nhật ký thao tác trên bài giảng (tạo/sửa/xóa): ai làm, lúc nào, lý do và IP.
// IdBaiGiang cho phép NULL để giữ lại lịch sử khi bài giảng đã bị xóa hẳn.
const LichSuThayDoiBaiGiang = {
  table: 'tb_LichSuThayDoiBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    IdBaiGiang: {
      type: sql.Int,
      nullable: true,
      references: { table: 'tb_BaiGiang', column: 'Id' },
    },
    NgayTao: { type: sql.DateTime, nullable: true },
    NgaySua: { type: sql.DateTime, nullable: true },
    NgayXoa: { type: sql.DateTime, nullable: true },
    MaNguoiTao: { type: sql.NVarChar(50), nullable: true },
    MaNguoiSua: { type: sql.NVarChar(50), nullable: true },
    MaNguoiXoa: { type: sql.NVarChar(50), nullable: true },
    LyDoSua: { type: sql.NVarChar(500), nullable: true },
    LyDoXoa: { type: sql.NVarChar(500), nullable: true },
    DiaChiIP: { type: sql.VarChar(45), nullable: true },
  },
};

module.exports = LichSuThayDoiBaiGiang;
