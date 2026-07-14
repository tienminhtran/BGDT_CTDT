const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

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
 * sẽ đếm lại từ 1 (xử lý ngay trong câu MERGE, không cần job dọn).
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

/**
 * Tăng 1 bộ đếm và trả về giá trị sau khi tăng. Atomic trong 1 câu lệnh:
 *   - chưa có dòng            -> INSERT FailCount = 1, mở cửa sổ mới
 *   - có dòng, còn trong cửa sổ -> FailCount + 1
 *   - có dòng, cửa sổ đã hết  -> đếm lại từ 1, mở cửa sổ mới
 */
async function tangBoDem(scope, key, ttlGiay) {
  const rows = await sequelize.query(
    `MERGE tb_LoginAttempt WITH (HOLDLOCK) AS t
     USING (SELECT :scope AS Scope, :key AS ScopeKey) AS s
       ON t.Scope = s.Scope AND t.ScopeKey = s.ScopeKey
     WHEN MATCHED THEN
       -- SQL Server chỉ cho 1 nhánh WHEN MATCHED ... UPDATE -> tách 2 trường hợp bằng CASE:
       --   còn trong cửa sổ  -> +1, giữ nguyên hạn
       --   cửa sổ đã hết hạn -> đếm lại từ 1, mở cửa sổ mới
       UPDATE SET
         FailCount = CASE WHEN t.ExpiresAt > SYSUTCDATETIME() THEN t.FailCount + 1 ELSE 1 END,
         ExpiresAt = CASE WHEN t.ExpiresAt > SYSUTCDATETIME()
                          THEN t.ExpiresAt
                          ELSE DATEADD(second, :ttl, SYSUTCDATETIME()) END,
         UpdatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN
       INSERT (Scope, ScopeKey, FailCount, ExpiresAt, UpdatedAt)
       VALUES (s.Scope, s.ScopeKey, 1, DATEADD(second, :ttl, SYSUTCDATETIME()), SYSUTCDATETIME())
     OUTPUT inserted.FailCount AS failCount;`,
    { replacements: { scope, key, ttl: ttlGiay }, type: QueryTypes.SELECT }
  );
  return rows[0]?.failCount ?? 0;
}

// Đọc bộ đếm hiện tại (0 nếu chưa có hoặc cửa sổ đã hết hạn).
async function docBoDem(scope, key) {
  const rows = await sequelize.query(
    `SELECT FailCount AS failCount FROM tb_LoginAttempt
      WHERE Scope = :scope AND ScopeKey = :key AND ExpiresAt > SYSUTCDATETIME();`,
    { replacements: { scope, key }, type: QueryTypes.SELECT }
  );
  return rows[0]?.failCount ?? 0;
}

/**
 * Tài khoản có đang bị khóa không?
 * @returns {Promise<number>} số giây còn lại (0 = không bị khóa)
 */
async function thoiGianKhoaConLai(username) {
  const rows = await sequelize.query(
    `SELECT DATEDIFF(second, SYSUTCDATETIME(), ExpiresAt) AS conLai
       FROM tb_LoginAttempt
      WHERE Scope = 'lock' AND ScopeKey = :key AND ExpiresAt > SYSUTCDATETIME();`,
    { replacements: { key: chuanHoaUsername(username) }, type: QueryTypes.SELECT }
  );
  const conLai = rows[0]?.conLai ?? 0;
  return conLai > 0 ? conLai : 0;
}

// Đặt/gia hạn khóa tài khoản.
async function khoaTaiKhoan(username, giay) {
  await sequelize.query(
    `MERGE tb_LoginAttempt WITH (HOLDLOCK) AS t
     USING (SELECT 'lock' AS Scope, :key AS ScopeKey) AS s
       ON t.Scope = s.Scope AND t.ScopeKey = s.ScopeKey
     WHEN MATCHED THEN
       UPDATE SET ExpiresAt = DATEADD(second, :giay, SYSUTCDATETIME()), UpdatedAt = SYSUTCDATETIME()
     WHEN NOT MATCHED THEN
       INSERT (Scope, ScopeKey, FailCount, ExpiresAt, UpdatedAt)
       VALUES ('lock', s.ScopeKey, 0, DATEADD(second, :giay, SYSUTCDATETIME()), SYSUTCDATETIME());`,
    { replacements: { key: chuanHoaUsername(username), giay } }
  );
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
    await sequelize.query(
      `DELETE FROM tb_LoginAttempt WHERE Scope = 'user' AND ScopeKey = :key;`,
      { replacements: { key: u } }
    );
  }

  return { canCaptcha: soLanUserIp >= NGUONG_CAPTCHA, khoaTrongGiay };
}

// Đăng nhập ĐÚNG -> xóa sạch bộ đếm của user này (theo username, ip và cặp username+ip).
async function xoaBoDem(username, ip) {
  const u = chuanHoaUsername(username);
  await sequelize.query(
    `DELETE FROM tb_LoginAttempt
      WHERE (Scope = 'user_ip' AND ScopeKey = :userIp)
         OR (Scope = 'user'    AND ScopeKey = :user)
         OR (Scope = 'ip'      AND ScopeKey = :ip)
         OR (Scope = 'lock'    AND ScopeKey = :user);`,
    { replacements: { userIp: `${u}|${ip}`, user: u, ip } }
  );
}

/**
 * Đánh dấu 1 captcha (theo jti) là ĐÃ dùng. Dựa vào unique index (Scope, ScopeKey):
 * lần thứ hai insert cùng jti sẽ lỗi -> trả false (captcha bị dùng lại).
 * @param {string} jti
 * @param {number} exp  thời điểm hết hạn của captcha token (epoch giây)
 * @returns {Promise<boolean>} true nếu đây là lần dùng đầu tiên
 */
async function danhDauCaptchaDaDung(jti, exp) {
  try {
    await sequelize.query(
      `INSERT INTO tb_LoginAttempt (Scope, ScopeKey, FailCount, ExpiresAt, UpdatedAt)
       VALUES ('captcha', :jti, 0, :exp, SYSUTCDATETIME());`,
      { replacements: { jti, exp: new Date(exp * 1000) } }
    );
    return true;
  } catch (_) {
    return false; // trùng khóa -> captcha này đã được dùng rồi
  }
}

// Dọn các dòng đã hết hạn (bộ đếm, khóa, captcha đã dùng). Gọi định kỳ từ server.js.
async function donRacHetHan() {
  await sequelize.query(
    `DELETE FROM tb_LoginAttempt WHERE ExpiresAt < SYSUTCDATETIME();`
  );
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
