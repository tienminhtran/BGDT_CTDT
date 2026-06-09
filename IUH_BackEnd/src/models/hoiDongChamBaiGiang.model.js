const { sql } = require('../config/db');

const HoiDongChamBaiGiang = {
  table: 'tb_HoiDongChamBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    DotBaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_DotBaiGiang', column: 'Id' },
    },
    MaHoiDong: { type: sql.VarChar(50), nullable: false, unique: true },
    TenHoiDong: { type: sql.NVarChar(255), nullable: false },
  },
};

module.exports = HoiDongChamBaiGiang;
