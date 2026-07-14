const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Captcha tự sinh (không phụ thuộc dịch vụ ngoài): server vẽ ảnh SVG chứa mã,
// trả ảnh dưới dạng base64 (data URI) + 1 token ký. Đáp án KHÔNG nằm trong token
// (payload JWT chỉ là base64, ai cũng đọc được) mà chỉ lưu dạng hash HMAC.

const CAPTCHA_TTL = parseInt(process.env.CAPTCHA_TTL_SECONDS, 10) || 300; // 5 phút
const LENGTH = 5;
// Bỏ các ký tự dễ nhìn nhầm: I/1, O/0, S/5, Z/2
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY346789';

function hashDapAn(text) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(String(text).trim().toUpperCase())
    .digest('hex');
}

function randInt(max) {
  return crypto.randomInt(0, max);
}

function sinhMa() {
  let s = '';
  for (let i = 0; i < LENGTH; i += 1) s += ALPHABET[randInt(ALPHABET.length)];
  return s;
}

// Vẽ ảnh SVG: mỗi ký tự lệch vị trí/xoay/màu khác nhau + nhiễu đường kẻ và chấm.
function veSvg(code) {
  const W = 160;
  const H = 56;
  const parts = [];

  for (let i = 0; i < 4; i += 1) {
    const x1 = randInt(W);
    const y1 = randInt(H);
    const x2 = randInt(W);
    const y2 = randInt(H);
    const mau = `hsl(${randInt(360)},60%,70%)`;
    parts.push(
      `<path d="M${x1} ${y1} Q ${randInt(W)} ${randInt(H)} ${x2} ${y2}" stroke="${mau}" stroke-width="${1 + randInt(2)}" fill="none"/>`
    );
  }

  for (let i = 0; i < 30; i += 1) {
    parts.push(
      `<circle cx="${randInt(W)}" cy="${randInt(H)}" r="${1 + randInt(2)}" fill="hsl(${randInt(360)},50%,75%)"/>`
    );
  }

  const buoc = (W - 30) / code.length;
  code.split('').forEach((ch, i) => {
    const x = 20 + i * buoc;
    const y = 36 + randInt(9) - 4;
    const goc = randInt(41) - 20; // -20..20 độ
    const mau = `hsl(${randInt(360)},70%,32%)`;
    parts.push(
      `<text x="${x}" y="${y}" fill="${mau}" font-family="Verdana,Arial,sans-serif" font-size="${26 + randInt(7)}" font-weight="bold" transform="rotate(${goc} ${x} ${y})">${ch}</text>`
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#f2f4f7"/>${parts.join('')}</svg>`;
}

/**
 * Sinh 1 captcha mới.
 * @returns {{ captchaToken:string, image:string, expiresIn:number }}
 *   image = data URI base64 -> gán thẳng vào <img src="...">
 */
function taoCaptcha() {
  const code = sinhMa();
  const captchaToken = jwt.sign(
    { typ: 'captcha', h: hashDapAn(code) },
    process.env.JWT_SECRET,
    { expiresIn: CAPTCHA_TTL, jwtid: crypto.randomUUID() }
  );

  const base64 = Buffer.from(veSvg(code), 'utf8').toString('base64');
  return {
    captchaToken,
    image: `data:image/svg+xml;base64,${base64}`,
    expiresIn: CAPTCHA_TTL,
  };
}

/**
 * Kiểm tra captcha người dùng nhập. Ném lỗi 400 nếu sai/hết hạn.
 * Chỉ xác thực nội dung; việc chống dùng lại (1 captcha = 1 lần) do loginGuard đảm nhiệm.
 * @returns {{ jti:string, exp:number }} để đánh dấu đã dùng
 */
function kiemTraCaptcha(captchaToken, text) {
  const loi = new Error('Mã captcha không đúng hoặc đã hết hạn');
  loi.status = 400;

  if (!captchaToken || !text) throw loi;

  let payload;
  try {
    payload = jwt.verify(captchaToken, process.env.JWT_SECRET);
  } catch (_) {
    throw loi;
  }
  if (payload.typ !== 'captcha' || !payload.h || !payload.jti) throw loi;

  const nhap = Buffer.from(hashDapAn(text));
  const dung = Buffer.from(payload.h);
  if (nhap.length !== dung.length || !crypto.timingSafeEqual(nhap, dung)) throw loi;

  return { jti: payload.jti, exp: payload.exp };
}

module.exports = { taoCaptcha, kiemTraCaptcha, CAPTCHA_TTL };
