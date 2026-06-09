const { sql } = require('../config/db');

const ChiTietHoiDongBaiGiang = {
  table: 'tb_ChiTietHoiDongBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    HoiDongChamBaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_HoiDongChamBaiGiang', column: 'Id' },
    },
    GiangVienId: { type: sql.Int, nullable: false },
    TrongSo: { type: sql.Decimal(3, 2), nullable: true, default: 1.0 },
    DaKhoa: { type: sql.Bit, nullable: true, default: 0 },
  },
};

module.exports = ChiTietHoiDongBaiGiang;
