const { sql } = require('../config/db');

const SinhVienHocPhan = {
  table: 'tb_SinhVienHocPhan',
  columns: {
    id: { type: sql.BigInt, primaryKey: true, identity: true },
    MaSinhVien: { 
      type: sql.NVarChar(20), 
      nullable: false 
    },
    MaHocPhan: { 
      type: sql.NVarChar(20),
      nullable: false 
    },
  },
};

module.exports = SinhVienHocPhan;
