const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize');

/**
 * Định nghĩa các Sequelize model (ORM) cho luồng bài giảng.
 * Chỉ khai báo các cột thực sự dùng trong query của baiGiang.service.js,
 * giữ đúng tên bảng/cột gốc trong SQL Server.
 */

const Monhoc = sequelize.define(
  'Monhoc',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    ma_tuquan: { type: DataTypes.STRING(20) },
    tenmon: { type: DataTypes.STRING(200) },
  },
  { tableName: 'tb_monhoc' }
);

const MonhocVersion = sequelize.define(
  'MonhocVersion',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    id_monhoc: { type: DataTypes.BIGINT },
    version: { type: DataTypes.STRING(100) },
  },
  { tableName: 'tb_monhoc_version' }
);

const DangKyBaiGiang = sequelize.define(
  'DangKyBaiGiang',
  {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    MonHocVersionId: { type: DataTypes.INTEGER },
  },
  { tableName: 'tb_DangKyBaiGiang' }
);

const ChiTietDangKyBaiGiang = sequelize.define(
  'ChiTietDangKyBaiGiang',
  {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    DangKyBaiGiangId: { type: DataTypes.INTEGER },
    NoiDungChuong: { type: DataTypes.STRING(100) },
    GhiChu: { type: DataTypes.TEXT },
  },
  { tableName: 'tb_ChiTietDangKyBaiGiang' }
);

const BaiGiang = sequelize.define(
  'BaiGiang',
  {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ChiTietDangKyBaiGiangId: { type: DataTypes.INTEGER },
    TenBaiGiang: { type: DataTypes.STRING(255) },
    LinkBaiGiang: { type: DataTypes.STRING(500) },
    LinkChunkBaiGiang: { type: DataTypes.TEXT },
  },
  { tableName: 'tb_BaiGiang' }
);

const DanhGiaBaiGiang = sequelize.define(
  'DanhGiaBaiGiang',
  {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    BaiGiangId: { type: DataTypes.INTEGER },
    MSSV: { type: DataTypes.STRING(20) },
    SoSao: { type: DataTypes.TINYINT },
    BinhLuan: { type: DataTypes.STRING(255) },
    // Có DB default GETDATE() -> không khai báo defaultValue để DB tự điền khi INSERT.
    NgayDanhGia: { type: DataTypes.DATE },
  },
  { tableName: 'tb_DanhGiaBaiGiang' }
);

const SinhVienHocPhan = sequelize.define(
  'SinhVienHocPhan',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    MaSinhVien: { type: DataTypes.STRING(20) },
    MaHocPhan: { type: DataTypes.STRING(20) },
  },
  { tableName: 'tb_SinhVienHocPhan' }
);

const HocPhanMonHoc = sequelize.define(
  'HocPhanMonHoc',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    MaHocPhan: { type: DataTypes.STRING(20) },
    MaMon: { type: DataTypes.STRING(20) },
  },
  { tableName: 'tb_HocPhanMonHoc' }
);

// Quan hệ:
//   BaiGiang -> ChiTietDangKyBaiGiang -> DangKyBaiGiang -> MonhocVersion -> Monhoc
BaiGiang.belongsTo(ChiTietDangKyBaiGiang, {
  foreignKey: 'ChiTietDangKyBaiGiangId',
  as: 'ChiTiet',
});
ChiTietDangKyBaiGiang.hasOne(BaiGiang, {
  foreignKey: 'ChiTietDangKyBaiGiangId',
  as: 'BaiGiang',
});

ChiTietDangKyBaiGiang.belongsTo(DangKyBaiGiang, {
  foreignKey: 'DangKyBaiGiangId',
  as: 'DangKy',
});
DangKyBaiGiang.hasMany(ChiTietDangKyBaiGiang, {
  foreignKey: 'DangKyBaiGiangId',
  as: 'ChiTietList',
});

DangKyBaiGiang.belongsTo(MonhocVersion, {
  foreignKey: 'MonHocVersionId',
  targetKey: 'id',
  as: 'MonHocVersion',
});

MonhocVersion.belongsTo(Monhoc, {
  foreignKey: 'id_monhoc',
  targetKey: 'id',
  as: 'Monhoc',
});
Monhoc.hasMany(MonhocVersion, {
  foreignKey: 'id_monhoc',
  sourceKey: 'id',
  as: 'Versions',
});

// Quan hệ ghép theo mã học phần (không phải khóa chính):
//   tb_SinhVienHocPhan.MaHocPhan = tb_HocPhanMonHoc.MaHocPhan
SinhVienHocPhan.hasMany(HocPhanMonHoc, {
  foreignKey: 'MaHocPhan',
  sourceKey: 'MaHocPhan',
  as: 'MonHocList',
});

module.exports = {
  sequelize,
  Monhoc,
  MonhocVersion,
  DangKyBaiGiang,
  ChiTietDangKyBaiGiang,
  BaiGiang,
  DanhGiaBaiGiang,
  SinhVienHocPhan,
  HocPhanMonHoc,
};
