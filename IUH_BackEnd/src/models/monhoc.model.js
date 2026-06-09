const { sql } = require('../config/db');

const Monhoc = {
  table: 'tb_monhoc',
  columns: {
    id: { type: sql.BigInt, primaryKey: true, identity: true },
    ma_tuquan: { type: sql.NVarChar(20), nullable: true, unique: true },
    tenmon: { type: sql.NVarChar(200), nullable: true },
    tenmon_tienganh: { type: sql.VarChar(200), nullable: true },
    sotinchi: { type: sql.SmallInt, nullable: false },
    sotinchi_lt: { type: sql.SmallInt, nullable: false },
    id_bomon: { type: sql.SmallInt, nullable: true },
    loaimonhoc: { type: sql.TinyInt, nullable: true },
    id_donviquanly: { type: sql.SmallInt, nullable: true },
    thuchanhtrenphonglt: { type: sql.Bit, nullable: true },
    isLocked: { type: sql.Bit, nullable: false },
    ghichu: { type: sql.NVarChar(200), nullable: true },
    ngaytao: { type: sql.DateTime, nullable: true },
    ngaycapnhat: { type: sql.DateTime, nullable: true },
  },
};

module.exports = Monhoc;
