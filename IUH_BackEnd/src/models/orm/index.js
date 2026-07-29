const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/sequelize');
const { TRANG_THAI_XU_LY_CHUNK } = require('../baiGiang.model');

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
    SoThuTu: { type: DataTypes.INTEGER }, // số thứ tự chương (sắp xếp danh sách bài giảng)
  },
  { tableName: 'tb_ChiTietDangKyBaiGiang' }
);

const BaiGiang = sequelize.define(
  'BaiGiang',
  {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ChiTietDangKyBaiGiangId: { type: DataTypes.INTEGER },
    TenBaiGiang: { type: DataTypes.STRING(255) },
    NoiDungBaiGiang: { type: DataTypes.TEXT },
    LinkBaiGiang: { type: DataTypes.STRING(500) },
    LinkChunkBaiGiang: { type: DataTypes.TEXT },
    LuotXem: { type: DataTypes.INTEGER },
    // BIT NULL DEFAULT 0 -> null nghĩa là chưa khóa. Bài giảng đã khóa thì cấm xóa video.
    DaKhoa: { type: DataTypes.BOOLEAN },

    // --- Tiến trình xử lý (chunk hóa) video, xem sql/05_them_cot_xu_ly_chunk.sql ---
    // ChuaXuLy | DangCho | DangXuLy | HoanThanh | ThatBai
    TrangThaiXuLyChunk: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: TRANG_THAI_XU_LY_CHUNK.CHUA_XU_LY,
      validate: { isIn: [Object.values(TRANG_THAI_XU_LY_CHUNK)] },
    },
    // NVARCHAR(MAX) chứa JSON array các chunk. Dialect mssql không có kiểu JSON
    // -> tự parse/stringify để service làm việc với mảng JS.
    DanhSachChunk: {
      type: DataTypes.TEXT,
      get() {
        const raw = this.getDataValue('DanhSachChunk');
        if (!raw) return null;
        try {
          return JSON.parse(raw);
        } catch {
          return null; // dữ liệu hỏng -> coi như chưa có chunk, không làm vỡ response
        }
      },
      set(value) {
        this.setDataValue(
          'DanhSachChunk',
          value == null || typeof value === 'string' ? value : JSON.stringify(value)
        );
      },
    },
    ThoiLuongGiay: { type: DataTypes.FLOAT }, // tổng thời lượng video (giây)
    NgayBatDauXuLy: { type: DataTypes.DATE },
    NgayHoanThanhXuLy: { type: DataTypes.DATE },
    LoiXuLy: { type: DataTypes.TEXT },
    SoLanThuLai: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    NgayThuLaiSauKhi: { type: DataTypes.DATE }, // mốc sớm nhất được bốc lại (backoff)
    MaJobXuLy: { type: DataTypes.STRING(100) }, // id lượt chạy worker, để đối chiếu log
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

// Nhật ký thao tác trên bài giảng (tạo/sửa/xóa): mỗi bản ghi lưu ai làm, lúc nào,
// lý do và IP. IdBaiGiang NULL được (bài giảng đã bị xóa hẳn thì vẫn giữ lại lịch sử).
const LichSuThayDoiBaiGiang = sequelize.define(
  'LichSuThayDoiBaiGiang',
  {
    Id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IdBaiGiang: { type: DataTypes.INTEGER },
    NgayTao: { type: DataTypes.DATE },
    NgaySua: { type: DataTypes.DATE },
    NgayXoa: { type: DataTypes.DATE },
    MaNguoiTao: { type: DataTypes.STRING(50) },
    MaNguoiSua: { type: DataTypes.STRING(50) },
    MaNguoiXoa: { type: DataTypes.STRING(50) },
    LyDoSua: { type: DataTypes.STRING(500) },
    LyDoXoa: { type: DataTypes.STRING(500) },
    DiaChiIP: { type: DataTypes.STRING(45) },
  },
  { tableName: 'tb_LichSuThayDoiBaiGiang' }
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

// Bộ đếm chống dò mật khẩu (xem sql/03_login_guard.sql).
// Unique index (Scope, ScopeKey) là ràng buộc mà findOrCreate/upsert dựa vào.
const LoginAttempt = sequelize.define(
  'LoginAttempt',
  {
    Id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    Scope: { type: DataTypes.STRING(16), allowNull: false, unique: 'UX_Scope_Key' },
    ScopeKey: { type: DataTypes.STRING(200), allowNull: false, unique: 'UX_Scope_Key' },
    FailCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    ExpiresAt: { type: DataTypes.DATE, allowNull: false },
    UpdatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: 'tb_LoginAttempt' }
);

// Trạng thái tài khoản đăng nhập app giảng viên.
// Khớp CHECK constraint CK_tb_login_bgdt_trangthai (sql/06_tao_bang_login_bgdt.sql).
const TRANG_THAI_TAI_KHOAN = {
  HOAT_DONG: 'HoatDong',
  KHOA: 'Khoa',
};

// Tài khoản đăng nhập app giảng viên. matkhau là chuỗi băm bcrypt - mọi truy vấn
// trả dữ liệu ra ngoài phải liệt kê attributes tường minh để không lộ cột này.
const LoginBgdt = sequelize.define(
  'LoginBgdt',
  {
    Manhansu: { type: DataTypes.STRING(50), primaryKey: true },
    hoten: { type: DataTypes.STRING(255), allowNull: false },
    matkhau: { type: DataTypes.STRING(255), allowNull: false },
    trangthai: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: TRANG_THAI_TAI_KHOAN.HOAT_DONG,
      validate: { isIn: [Object.values(TRANG_THAI_TAI_KHOAN)] },
    },
  },
  { tableName: 'tb_login_bgdt' }
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

// Đánh giá thuộc về 1 bài giảng -> để include lấy tên môn/bài giảng khi liệt kê đánh giá của SV.
DanhGiaBaiGiang.belongsTo(BaiGiang, { foreignKey: 'BaiGiangId', as: 'BaiGiang' });

// Lịch sử thao tác thuộc về 1 bài giảng (FK IdBaiGiang, cho phép NULL).
LichSuThayDoiBaiGiang.belongsTo(BaiGiang, { foreignKey: 'IdBaiGiang', as: 'BaiGiang' });
BaiGiang.hasMany(LichSuThayDoiBaiGiang, { foreignKey: 'IdBaiGiang', as: 'LichSuThayDoi' });

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
  TRANG_THAI_XU_LY_CHUNK,
  TRANG_THAI_TAI_KHOAN,
  LoginBgdt,
  Monhoc,
  MonhocVersion,
  DangKyBaiGiang,
  ChiTietDangKyBaiGiang,
  BaiGiang,
  DanhGiaBaiGiang,
  LichSuThayDoiBaiGiang,
  SinhVienHocPhan,
  HocPhanMonHoc,
  LoginAttempt,
};
