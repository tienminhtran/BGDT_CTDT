/**
 * Kho phiên web LMS (cookie MoodleSession + sesskey) của từng SV đang đăng nhập.
 *
 * Chỉ nằm trong RAM, KHÔNG ghi DB: đây là thông tin nhạy cảm tương đương mật khẩu
 * đã đăng nhập, mất khi restart là chấp nhận được (SV đăng nhập lại là có phiên mới).
 * Lưu ý: nếu chạy nhiều instance backend sau load balancer thì mỗi instance giữ kho
 * riêng -> cần bật sticky session, hoặc chuyển sang Redis.
 *
 * Không lưu mật khẩu -> hết TTL thì KHÔNG tự gia hạn được, FE phải cho SV đăng nhập lại.
 */

const TTL = (parseInt(process.env.MOODLE_SESSION_TTL_SECONDS, 10) || 7200) * 1000; // 2 giờ

const kho = new Map(); // username -> { cookie, sesskey, userid, hetHan }

function khoa(username) {
  return String(username || '').trim().toLowerCase();
}

function luu(username, phien) {
  const k = khoa(username);
  if (!k || !phien?.cookie || !phien?.sesskey) return null;
  const ban = { ...phien, hetHan: Date.now() + TTL };
  kho.set(k, ban);
  return ban;
}

// Trả null nếu chưa có hoặc đã quá hạn.
function lay(username) {
  const k = khoa(username);
  const phien = kho.get(k);
  if (!phien) return null;
  if (phien.hetHan <= Date.now()) {
    kho.delete(k);
    return null;
  }
  return phien;
}

function xoa(username) {
  kho.delete(khoa(username));
}

// Dọn định kỳ để kho không phình theo số SV đã từng đăng nhập.
// unref() -> interval này không giữ tiến trình Node sống khi shutdown.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of kho) {
    if (v.hetHan <= now) kho.delete(k);
  }
}, 10 * 60 * 1000).unref();

module.exports = { luu, lay, xoa, TTL };
