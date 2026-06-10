const crypto = require('crypto');

/**
 * Mã hóa "khóa môn học" (mã môn + phiên bản) thành 1 token mờ (opaque) để client
 * KHÔNG đọc/đoán được mã môn gốc. Khác với Base64 (giải ngược được), token này được
 * mã hóa AES-256-GCM bằng khóa bí mật của server -> chỉ server giải được.
 *
 * Dùng cho URL trang xem bài giảng và các request (?course=<token>) thay cho maMon.
 */

// Khóa 32 byte suy ra từ secret của server (tái dùng JWT_SECRET nếu không khai báo riêng).
const SECRET = process.env.COURSE_TOKEN_SECRET || process.env.JWT_SECRET || 'dev-course-secret';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

const b64urlEncode = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const b64urlDecode = (str) => {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
};

/**
 * @param {{ maMon: string, version?: string|null }} payload
 * @returns {string} token mờ (URL-safe)
 */
function encodeCourse({ maMon, version }) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  // Payload gọn: m = mã môn, v = phiên bản
  const plain = JSON.stringify({ m: maMon, v: version ?? null });
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return b64urlEncode(Buffer.concat([iv, tag, enc]));
}

/**
 * Giải token về { maMon, version }. Token sai/giả mạo -> ném lỗi 400.
 * @param {string} token
 * @returns {{ maMon: string, version: string|null }}
 */
function decodeCourse(token) {
  try {
    const buf = b64urlDecode(token);
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    const obj = JSON.parse(out);
    return { maMon: obj.m, version: obj.v ?? null };
  } catch (_) {
    const err = new Error('Mã khóa học không hợp lệ');
    err.status = 400;
    throw err;
  }
}

module.exports = { encodeCourse, decodeCourse };
