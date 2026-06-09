const { sql } = require('../config/db');

const HocPhanMonHoc = {
  table: 'tb_HocPhanMonHoc',
  columns: {
    id: { type: sql.BigInt, primaryKey: true, identity: true },
    MaHocPhan: { 
      type: sql.NVarChar(20), 
      nullable: false 
    },
    MaMon: {
      type: sql.NVarChar(20),
      nullable: false
    },
  },
};

module.exports = HocPhanMonHoc;

