const jwt = require('jsonwebtoken');

/**
 * Cookie phiên (HttpOnly) chứa danh tính NGƯỜI ĐANG ĐĂNG NHẬP (mssv, hoặc '__TEACHER__').
 *
 * Lý do tồn tại: request tải HLS (thẻ <video>, hls.js, hay gõ URL thẳng) chỉ mang theo
 * COOKIE, không mang Bearer wstoken. Nên server không thể biết "ai đang xem" nếu chỉ dựa
 * vào vé phát (hls_<id>). Cookie 'sid' này cho streamHls biết danh tính hiện tại để đối
 * chiếu với danh tính đã ghi trong vé -> chặn dùng vé cũ của tài khoản khác còn sót trong
 * cùng trình duyệt.
 */

const SID_TTL = process.env.SID_TTL || '12h';
const SID_COOKIE = 'sid';

// Ghi danh tính hiện tại vào cookie 'sid' (ký JWT). Gọi khi đăng nhập / xác thực lại.
// `req` dùng để biết kết nối hiện tại có phải HTTPS không: cookie Secure bị trình duyệt
// âm thầm bỏ qua trên HTTP (vd server nội bộ chạy http://<ip>:port dù NODE_ENV=production)
// -> phải xét theo kết nối thực tế thay vì hardcode theo NODE_ENV.
function setSid(res, subject, req) {
  const token = jwt.sign({ sub: String(subject) }, process.env.JWT_SECRET, {
    expiresIn: SID_TTL,
  });
  const exp = jwt.decode(token)?.exp;
  const maxAge = exp ? Math.max(0, exp * 1000 - Date.now()) : undefined;
  res.cookie(SID_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !!req?.secure,
    path: '/api', // gửi cho mọi route /api, gồm cả /api/lectures/:id/hls/*
    maxAge,
  });
}

// Đọc danh tính từ cookie 'sid'. Trả null nếu thiếu/giả mạo/hết hạn.
function readSid(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  let val = null;
  for (const part of raw.split(';')) {
    const c = part.trim();
    if (c.startsWith(`${SID_COOKIE}=`)) {
      val = decodeURIComponent(c.slice(SID_COOKIE.length + 1));
      break;
    }
  }
  if (!val) return null;
  try {
    return jwt.verify(val, process.env.JWT_SECRET).sub;
  } catch (_) {
    return null;
  }
}

// Xóa cookie phiên (dùng khi đăng xuất).
function clearSid(res) {
  res.clearCookie(SID_COOKIE, { path: '/api' });
}

module.exports = { setSid, readSid, clearSid, SID_COOKIE };
