const { sql } = require('../config/db');

const DotBaiGiang = {
  table: 'tb_DotBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    TenDot: { type: sql.NVarChar(255), nullable: false },
    Nam: { type: sql.Int, nullable: false },
    KichHoat: { type: sql.Bit, nullable: true, default: 0 },
    DaKhoa: { type: sql.Bit, nullable: true, default: 0 },
  },
};

module.exports = DotBaiGiang;
