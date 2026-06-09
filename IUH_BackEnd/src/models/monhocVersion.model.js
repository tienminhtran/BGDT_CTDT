const { sql } = require('../config/db');

const MonhocVersion = {
  table: 'tb_monhoc_version',
  columns: {
    id: { type: sql.BigInt, primaryKey: true, identity: true },
    id_monhoc: {
      type: sql.BigInt,
      nullable: true,
      references: { table: 'tb_monhoc', column: 'id' },
    },
    version: { type: sql.NVarChar(100), nullable: true },
    muctieu: { type: sql.NVarChar(sql.MAX), nullable: true },
    mota: { type: sql.NVarChar(sql.MAX), nullable: true },
    yeucaunguoihoc: { type: sql.NVarChar(sql.MAX), nullable: true },
    thangdiemdanhgia: { type: sql.NVarChar(sql.MAX), nullable: true },
    id_truongpho_kyten: { type: sql.VarChar(15), nullable: true },
    IdQuyChe: { type: sql.Int, nullable: true },
    isVisible: { type: sql.Bit, nullable: false },
    isLocked: { type: sql.Bit, nullable: false },
    ghichu: { type: sql.NVarChar(200), nullable: true },
    ngaytao: { type: sql.DateTime, nullable: true },
    ngaycapnhat: { type: sql.DateTime, nullable: true },
  },
  // UNIQUE (id_monhoc, version)
  uniqueKeys: [['id_monhoc', 'version']],
};

module.exports = MonhocVersion;
