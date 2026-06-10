const { sql } = require('../config/db');

const DanhGiaBaiGiang = {
  table: 'tb_DanhGiaBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    BaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_BaiGiang', column: 'Id' },
    },
    MSSV: { 
      type: sql.NVarChar(20), 
      nullable: false 
    },
    SoSao: { type: sql.TinyInt, nullable: false, check: { min: 1, max: 5 } },
    BinhLuan: { type: sql.NVarChar(255), nullable: true },
    NgayDanhGia: { type: sql.DateTime, nullable: false, default: 'GETDATE()' },
  },
  // Mỗi sinh viên chỉ đánh giá 1 lần cho 1 bài giảng
  uniqueKeys: [['BaiGiangId', 'MSSV']],
};

module.exports = DanhGiaBaiGiang;
