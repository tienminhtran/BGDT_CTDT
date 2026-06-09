const { sql } = require('../config/db');

const ChiTietDanhGiaBaiGiang = {
  table: 'tb_ChiTietDanhGiaBaiGiang',
  columns: {
    Id: { type: sql.Int, primaryKey: true, identity: true },
    BaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_BaiGiang', column: 'Id' },
    },
    ChiTietHoiDongBaiGiangId: {
      type: sql.Int,
      nullable: false,
      references: { table: 'tb_ChiTietHoiDongBaiGiang', column: 'Id' },
    },
    DiemSo: { type: sql.Decimal(5, 2), nullable: true, default: 0.0 },
    // Lưu JSON (ràng buộc CHECK isjson(ChiTiet) > 0)
    ChiTiet: { type: sql.NVarChar(sql.MAX), nullable: true, isJson: true },
    DatNguong: { type: sql.Bit, nullable: true, default: 1 },
    KhoaDiem: { type: sql.Bit, nullable: true, default: 0 },
  },
  // UNIQUE (BaiGiangId, ChiTietHoiDongBaiGiangId)
  uniqueKeys: [['BaiGiangId', 'ChiTietHoiDongBaiGiangId']],
};

module.exports = ChiTietDanhGiaBaiGiang;
