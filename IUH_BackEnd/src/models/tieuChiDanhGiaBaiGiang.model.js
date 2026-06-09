const { sql } = require('../config/db');

const TieuChiDanhGiaBaiGiang = {
  table: 'tb_TieuChiDanhGiaBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    DotBaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_DotBaiGiang', column: 'Id' },
    },
    TenTieuChi: { type: sql.NVarChar(255), nullable: false },
    TrongSo: { type: sql.Decimal(3, 2), nullable: false },
    DiemToiDa: { type: sql.Decimal(5, 2), nullable: false },
    DiemToiThieu: { type: sql.Decimal(5, 2), nullable: false, default: 0.0 },
  },
};

module.exports = TieuChiDanhGiaBaiGiang;
