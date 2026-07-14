const { Op } = require('sequelize');
const { LoginAttempt } = require('../models/orm');

/**
 * Chống dò mật khẩu (brute-force) cho POST /api/auth/login.
 *
 * Mọi bộ đếm nằm trong 1 bảng tb_LoginAttempt, phân biệt bằng cột Scope:
 *   - 'user_ip'  : số lần sai của (username + ip)  -> vượt ngưỡng thì bắt buộc captcha
 *   - 'user'     : số lần sai của username (mọi IP) -> vượt ngưỡng thì khóa tài khoản
 *   - 'ip'       : số lần sai của IP (mọi username) -> phát hiện quét diện rộng
 *   - 'lock'     : tài khoản đang bị khóa, ExpiresAt = thời điểm mở khóa
 *   - 'captcha'  : jti của captcha ĐÃ dùng -> chặn dùng lại 1 mã cho nhiều lần thử
 *
 * Mỗi bộ đếm có cửa sổ thời gian riêng (ExpiresAt). Hết cửa sổ, lần sai kế tiếp
 * sẽ đếm lại từ 1. Mốc thời gian lấy từ đồng hồ Node (gửi xuống DB theo UTC),
 * nên máy chạy app và SQL Server cần đồng bộ giờ (NTP).
 */

const NGUONG_CAPTCHA = parseInt(process.env.LOGIN_CAPTCHA_THRESHOLD, 10) || 4;
const NGUONG_KHOA = parseInt(process.env.LOGIN_LOCK_THRESHOLD, 10) || 10;
const THOI_GIAN_KHOA = parseInt(process.env.LOGIN_LOCK_SECONDS, 10) || 180; // 3 phút

// Cửa sổ đếm (giây)
const TTL = {
  user_ip: parseInt(process.env.LOGIN_WINDOW_USER_IP, 10) || 900, // 15 phút
  user: parseInt(process.env.LOGIN_WINDOW_USER, 10) || 900, // 15 phút
  ip: parseInt(process.env.LOGIN_WINDOW_IP, 10) || 3600, // 60 phút
};

// Lấy IP thật của client (app.js đã bật trust proxy để đọc X-Forwarded-For sau nginx).
function layIp(req) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  return String(ip).replace(/^::ffff:/, ''); // bỏ tiền tố IPv4-mapped
}

function chuanHoaUsername(username) {
  return String(username || '').trim().toLowerCase();
}

function hetHanSau(giay, moc = new Date()) {
  return new Date(moc.getTime() + giay * 1000);
}

/**
 * Tăng 1 bộ đếm và trả về giá trị sau khi tăng:
 *   - chưa có dòng             -> tạo mới, mở cửa sổ mới
 *   - có dòng, còn trong cửa sổ -> FailCount + 1
 *   - có dòng, cửa sổ đã hết   -> đếm lại từ 1, mở cửa sổ mới
 */
async function tangBoDem(scope, key, ttlGiay) {
  const bayGio = new Date();
  const hanMoi = hetHanSau(ttlGiay, bayGio);

  // 1) Cửa sổ đã hết hạn -> đưa bộ đếm về 0 và mở cửa sổ mới.
  //    UPDATE có điều kiện ExpiresAt <= now nên dòng còn hạn không bị đụng tới.
  await LoginAttempt.update(
    { FailCount: 0, ExpiresAt: hanMoi, UpdatedAt: bayGio },
    { where: { Scope: scope, ScopeKey: key, ExpiresAt: { [Op.lte]: bayGio } } }
  );

  // 2) Chưa có dòng -> tạo. Unique index (Scope, ScopeKey) chặn race:
  //    2 request cùng lúc thì 1 cái dính lỗi trùng khóa và findOrCreate tự SELECT lại.
  const [dong] = await LoginAttempt.findOrCreate({
    where: { Scope: scope, ScopeKey: key },
    defaults: { FailCount: 0, ExpiresAt: hanMoi, UpdatedAt: bayGio },
  });

  // 3) +1. increment sinh "SET FailCount = FailCount + 1" nên nhiều request song song
  //    không ghi đè lẫn nhau (không đọc-rồi-ghi -> không mất lượt đếm).
  await dong.increment('FailCount', { by: 1 });
  await dong.reload();

  return dong.FailCount;
}

// Đọc bộ đếm hiện tại (0 nếu chưa có hoặc cửa sổ đã hết hạn).
async function docBoDem(scope, key) {
  const dong = await LoginAttempt.findOne({
    attributes: ['FailCount'],
    where: { Scope: scope, ScopeKey: key, ExpiresAt: { [Op.gt]: new Date() } },
  });
  return dong?.FailCount ?? 0;
}

/**
 * Tài khoản có đang bị khóa không?
 * @returns {Promise<number>} số giây còn lại (0 = không bị khóa)
 */
async function thoiGianKhoaConLai(username) {
  const bayGio = new Date();
  const dong = await LoginAttempt.findOne({
    attributes: ['ExpiresAt'],
    where: {
      Scope: 'lock',
      ScopeKey: chuanHoaUsername(username),
      ExpiresAt: { [Op.gt]: bayGio },
    },
  });
  if (!dong) return 0;

  const conLai = Math.ceil((dong.ExpiresAt.getTime() - bayGio.getTime()) / 1000);
  return conLai > 0 ? conLai : 0;
}

// Đặt/gia hạn khóa tài khoản.
async function khoaTaiKhoan(username, giay) {
  const bayGio = new Date();
  const hanMoi = hetHanSau(giay, bayGio);
  const key = chuanHoaUsername(username);

  const [dong, moiTao] = await LoginAttempt.findOrCreate({
    where: { Scope: 'lock', ScopeKey: key },
    defaults: { FailCount: 0, ExpiresAt: hanMoi, UpdatedAt: bayGio },
  });
  if (!moiTao) await dong.update({ ExpiresAt: hanMoi, UpdatedAt: bayGio });
}

/**
 * Kiểm tra trước khi cho thử mật khẩu: đã tới ngưỡng phải nhập captcha chưa?
 */
async function canCaptcha(username, ip) {
  const soLan = await docBoDem('user_ip', `${chuanHoaUsername(username)}|${ip}`);
  return soLan >= NGUONG_CAPTCHA;
}

/**
 * Ghi nhận 1 lần đăng nhập SAI: tăng cả 3 bộ đếm; khóa tài khoản nếu vượt ngưỡng.
 * @returns {Promise<{ canCaptcha:boolean, khoaTrongGiay:number }>}
 */
async function ghiNhanDangNhapSai(username, ip) {
  const u = chuanHoaUsername(username);

  const [soLanUserIp, soLanUser] = await Promise.all([
    tangBoDem('user_ip', `${u}|${ip}`, TTL.user_ip),
    tangBoDem('user', u, TTL.user),
    tangBoDem('ip', ip, TTL.ip), // đếm để theo dõi/điều tra, không tự chặn
  ]);

  let khoaTrongGiay = 0;
  if (soLanUser >= NGUONG_KHOA) {
    await khoaTaiKhoan(u, THOI_GIAN_KHOA);
    khoaTrongGiay = THOI_GIAN_KHOA;
    // Đặt lại bộ đếm username: nếu không, ngay sau khi hết khóa chỉ cần sai 1 lần
    // là bị khóa lại tức thì (vì FailCount vẫn >= ngưỡng).
    await LoginAttempt.destroy({ where: { Scope: 'user', ScopeKey: u } });
  }

  return { canCaptcha: soLanUserIp >= NGUONG_CAPTCHA, khoaTrongGiay };
}

// Đăng nhập ĐÚNG -> xóa sạch bộ đếm của user này (theo username, ip và cặp username+ip).
async function xoaBoDem(username, ip) {
  const u = chuanHoaUsername(username);
  await LoginAttempt.destroy({
    where: {
      [Op.or]: [
        { Scope: 'user_ip', ScopeKey: `${u}|${ip}` },
        { Scope: 'user', ScopeKey: u },
        { Scope: 'ip', ScopeKey: ip },
        { Scope: 'lock', ScopeKey: u },
      ],
    },
  });
}

/**
 * Đánh dấu 1 captcha (theo jti) là ĐÃ dùng. Dựa vào unique index (Scope, ScopeKey):
 * lần thứ hai insert cùng jti sẽ lỗi trùng khóa -> trả false (captcha bị dùng lại).
 * @param {string} jti
 * @param {number} exp  thời điểm hết hạn của captcha token (epoch giây)
 * @returns {Promise<boolean>} true nếu đây là lần dùng đầu tiên
 */
async function danhDauCaptchaDaDung(jti, exp) {
  try {
    await LoginAttempt.create({
      Scope: 'captcha',
      ScopeKey: jti,
      FailCount: 0,
      ExpiresAt: new Date(exp * 1000),
      UpdatedAt: new Date(),
    });
    return true;
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError') return false; // jti này đã dùng rồi
    throw err; // lỗi khác (mất kết nối DB...) -> để tầng trên xử lý, không im lặng cho qua
  }
}

// Dọn các dòng đã hết hạn (bộ đếm, khóa, captcha đã dùng). Gọi định kỳ từ server.js.
async function donRacHetHan() {
  await LoginAttempt.destroy({ where: { ExpiresAt: { [Op.lt]: new Date() } } });
}

module.exports = {
  layIp,
  canCaptcha,
  thoiGianKhoaConLai,
  ghiNhanDangNhapSai,
  xoaBoDem,
  danhDauCaptchaDaDung,
  donRacHetHan,
  NGUONG_CAPTCHA,
  NGUONG_KHOA,
  THOI_GIAN_KHOA,
};
