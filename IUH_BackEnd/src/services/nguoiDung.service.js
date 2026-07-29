const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { LoginBgdt, TRANG_THAI_TAI_KHOAN: TT } = require('../models/orm');

/**
 * Tài khoản đăng nhập app giảng viên (bảng tb_login_bgdt).
 *
 * Đăng nhập trả về JWT; các API quản lý tài khoản đòi token này ở header
 * Authorization: Bearer <token> (middleware src/middlewares/auth.js).
 *
 * Mật khẩu luôn lưu dưới dạng băm bcrypt, không có đường nào đọc ngược ra được.
 */

const BCRYPT_COST = 10;
const HAN_TOKEN = process.env.TEACHER_TOKEN_TTL || '8h'; // đủ một ngày làm việc
const DAI_MAT_KHAU_TOI_THIEU = 6;

// Chỉ những cột được phép trả ra ngoài. Liệt kê tường minh để không bao giờ lỡ
// tay gửi cột matkhau (chuỗi băm) về client.
const COT_CONG_KHAI = ['Manhansu', 'hoten', 'trangthai'];

function loi(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Mã nhân sự dùng làm khóa chính -> chuẩn hóa để '  04112003 ' và '04112003' là một.
function chuanHoaMa(v) {
  return String(v ?? '').trim();
}

/**
 * Đăng nhập bằng mã nhân sự + mật khẩu.
 *
 * Sai tài khoản và sai mật khẩu đều trả CÙNG một thông báo: phân biệt hai trường
 * hợp sẽ giúp người dò biết mã nhân sự nào có thật.
 *
 * @returns {Promise<{ token:string, nguoiDung:{ Manhansu, hoten, trangthai } }>}
 */
async function dangNhap(manhansu, matkhau) {
  const ma = chuanHoaMa(manhansu);
  if (!ma || !matkhau) throw loi(400, 'Vui lòng nhập mã nhân sự và mật khẩu');

  const tk = await LoginBgdt.findByPk(ma);

  // So khớp cả khi không tìm thấy tài khoản để thời gian phản hồi không chênh lệch
  // rõ rệt giữa "không có tài khoản" và "sai mật khẩu" (giảm rò rỉ qua thời gian).
  const bam = tk?.matkhau || '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const khop = await bcrypt.compare(String(matkhau), bam);

  if (!tk || !khop) throw loi(401, 'Mã nhân sự hoặc mật khẩu không đúng');
  if (tk.trangthai === TT.KHOA) throw loi(403, 'Tài khoản đã bị khóa, liên hệ quản trị viên');

  if (!process.env.JWT_SECRET) throw loi(500, 'Chưa cấu hình JWT_SECRET trên server');

  const token = jwt.sign(
    { ma: tk.Manhansu, hoten: tk.hoten, vaiTro: 'giangvien' },
    process.env.JWT_SECRET,
    { expiresIn: HAN_TOKEN }
  );

  return {
    token,
    nguoiDung: { Manhansu: tk.Manhansu, hoten: tk.hoten, trangthai: tk.trangthai },
  };
}

// Danh sách tài khoản (không kèm mật khẩu).
async function danhSach() {
  return LoginBgdt.findAll({
    attributes: COT_CONG_KHAI,
    order: [['Manhansu', 'ASC']],
  });
}

/**
 * Tạo tài khoản mới. Mật khẩu được băm trước khi ghi.
 */
async function tao({ manhansu, hoten, matkhau, trangthai }) {
  const ma = chuanHoaMa(manhansu);
  const ten = String(hoten ?? '').trim();

  if (!ma) throw loi(400, 'Thiếu mã nhân sự');
  if (!ten) throw loi(400, 'Thiếu họ tên');
  if (!matkhau || String(matkhau).length < DAI_MAT_KHAU_TOI_THIEU) {
    throw loi(400, `Mật khẩu phải có ít nhất ${DAI_MAT_KHAU_TOI_THIEU} ký tự`);
  }

  const daCo = await LoginBgdt.findByPk(ma, { attributes: ['Manhansu'] });
  if (daCo) throw loi(409, `Mã nhân sự ${ma} đã tồn tại`);

  const tt = trangthai === TT.KHOA ? TT.KHOA : TT.HOAT_DONG;
  await LoginBgdt.create({
    Manhansu: ma,
    hoten: ten,
    matkhau: await bcrypt.hash(String(matkhau), BCRYPT_COST),
    trangthai: tt,
  });

  return { Manhansu: ma, hoten: ten, trangthai: tt };
}

/**
 * Đặt lại mật khẩu cho 1 tài khoản (quản trị viên cấp lại, KHÔNG cần mật khẩu cũ).
 *
 * Mật khẩu chỉ lưu dạng băm nên không có cách nào đọc lại mật khẩu cũ - quên là
 * phải cấp lại bằng hàm này.
 *
 * LƯU Ý: JWT đã cấp trước đó vẫn còn hiệu lực tới khi hết hạn (TEACHER_TOKEN_TTL).
 * Đổi mật khẩu KHÔNG đá phiên đang đăng nhập của tài khoản đó ra ngoài.
 */
async function datLaiMatKhau(manhansu, matkhauMoi) {
  const ma = chuanHoaMa(manhansu);
  if (!matkhauMoi || String(matkhauMoi).length < DAI_MAT_KHAU_TOI_THIEU) {
    throw loi(400, `Mật khẩu phải có ít nhất ${DAI_MAT_KHAU_TOI_THIEU} ký tự`);
  }

  const tk = await LoginBgdt.findByPk(ma, { attributes: COT_CONG_KHAI });
  if (!tk) throw loi(404, 'Không tìm thấy tài khoản');

  await LoginBgdt.update(
    { matkhau: await bcrypt.hash(String(matkhauMoi), BCRYPT_COST) },
    { where: { Manhansu: ma } }
  );

  return { Manhansu: ma, hoten: tk.hoten };
}

/**
 * Xóa hẳn 1 tài khoản.
 * @param {string} manhansu     tài khoản bị xóa
 * @param {string} maNguoiThucHien mã của người đang đăng nhập (chặn tự xóa mình)
 */
async function xoa(manhansu, maNguoiThucHien) {
  const ma = chuanHoaMa(manhansu);

  // Tự xóa mình sẽ khiến chính phiên đang thao tác mất hiệu lực giữa chừng.
  if (ma === chuanHoaMa(maNguoiThucHien)) {
    throw loi(400, 'Không thể tự xóa tài khoản đang đăng nhập');
  }

  const tk = await LoginBgdt.findByPk(ma, { attributes: ['Manhansu'] });
  if (!tk) throw loi(404, 'Không tìm thấy tài khoản');

  // Giữ lại ít nhất 1 tài khoản còn dùng được, nếu không sẽ không ai vào được nữa
  // và phải sửa tay dưới DB mới khôi phục được.
  await chanKhiHetTaiKhoanDungDuoc(ma);

  await LoginBgdt.destroy({ where: { Manhansu: ma } });
  return { Manhansu: ma };
}

/**
 * Khóa / mở khóa tài khoản.
 * @param {string} trangthai 'HoatDong' | 'Khoa'
 */
async function doiTrangThai(manhansu, trangthai, maNguoiThucHien) {
  const ma = chuanHoaMa(manhansu);
  if (![TT.HOAT_DONG, TT.KHOA].includes(trangthai)) {
    throw loi(400, 'Trạng thái không hợp lệ');
  }

  if (ma === chuanHoaMa(maNguoiThucHien) && trangthai === TT.KHOA) {
    throw loi(400, 'Không thể tự khóa tài khoản đang đăng nhập');
  }

  const tk = await LoginBgdt.findByPk(ma, { attributes: COT_CONG_KHAI });
  if (!tk) throw loi(404, 'Không tìm thấy tài khoản');

  if (trangthai === TT.KHOA) await chanKhiHetTaiKhoanDungDuoc(ma);

  await LoginBgdt.update({ trangthai }, { where: { Manhansu: ma } });
  return { Manhansu: ma, hoten: tk.hoten, trangthai };
}

// Chặn thao tác làm biến mất tài khoản 'HoatDong' cuối cùng (xóa hoặc khóa).
async function chanKhiHetTaiKhoanDungDuoc(maSapMat) {
  const conLai = await LoginBgdt.count({
    where: { trangthai: TT.HOAT_DONG },
  });
  const tk = await LoginBgdt.findByPk(maSapMat, { attributes: ['trangthai'] });

  // Chỉ tính khi tài khoản sắp mất đang ở trạng thái hoạt động.
  if (tk?.trangthai === TT.HOAT_DONG && conLai <= 1) {
    throw loi(409, 'Đây là tài khoản hoạt động cuối cùng, không thể khóa hoặc xóa');
  }
}

module.exports = {
  dangNhap,
  danhSach,
  tao,
  xoa,
  doiTrangThai,
  datLaiMatKhau,
  TRANG_THAI_TAI_KHOAN: TT,
};
