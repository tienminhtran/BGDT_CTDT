const moodle = require('../services/moodle.service');
const guard = require('../services/loginGuard.service');
const captcha = require('../services/captcha.service');
const phienWeb = require('../services/moodleSession.service');
const { setSid, clearSid, readSid } = require('../utils/sessionCookie');

function mapUser(info) {
  return {
    moodleId: info.userid,
    username: info.username,
    fullname: info.fullname,
  };
}

// GET /api/auth/captcha -> ảnh captcha (SVG base64) + token đi kèm.
// Client hiển thị image trong <img src>, rồi gửi lại captchaToken + captchaText khi login.
exports.captcha = (req, res) => {
  res.json(captcha.taoCaptcha());
};

// GET /api/auth/login-status?username=... -> cho FE biết trước có phải nhập captcha
// hoặc tài khoản đang bị khóa (để render form đúng, không cần thử sai 1 lần).
exports.loginStatus = async (req, res, next) => {
  try {
    const username = String(req.query.username || '').trim();
    if (!username) return res.status(400).json({ message: 'Thiếu tài khoản' });

    const [khoaConLai, phaiNhapCaptcha] = await Promise.all([
      guard.thoiGianKhoaConLai(username),
      guard.canCaptcha(username, guard.layIp(req)),
    ]);
    res.json({ locked: khoaConLai > 0, retryAfter: khoaConLai, captchaRequired: phaiNhapCaptcha });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login  -> đăng nhập bằng tài khoản LMS (popup)
// Body: { username, password, captchaToken?, captchaText? }
// Trả về wstoken (dùng làm phiên) + thông tin SV. Không lưu DB.
//
// Chống dò mật khẩu (bộ đếm ở tb_LoginAttempt):
//   1) Tài khoản đang bị khóa      -> 429 + Retry-After, KHÔNG thử mật khẩu.
//   2) Sai >= NGUONG_CAPTCHA lần   -> bắt buộc kèm captcha đúng; thiếu/sai captcha trả 428
//      và KHÔNG tính là 1 lần đăng nhập sai (tránh tự khóa mình vì gõ nhầm captcha).
//   3) Sai mật khẩu                -> tăng bộ đếm, tới ngưỡng thì khóa; báo lỗi chung chung
//      (không tiết lộ tài khoản có tồn tại hay không).
exports.login = async (req, res, next) => {
  try {
    const { username, password, captchaToken, captchaText } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Thiếu tài khoản hoặc mật khẩu' });
    }

    const ip = guard.layIp(req);

    // 1) Đang bị khóa?
    const khoaConLai = await guard.thoiGianKhoaConLai(username);
    if (khoaConLai > 0) {
      res.set('Retry-After', String(khoaConLai));
      return res.status(429).json({
        message: `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${khoaConLai} giây`,
        locked: true,
        retryAfter: khoaConLai,
      });
    }

    // 2) Đã tới ngưỡng phải nhập captcha?
    if (await guard.canCaptcha(username, ip)) {
      let ve;
      try {
        ve = captcha.kiemTraCaptcha(captchaToken, captchaText);
      } catch (_) {
        return res.status(428).json({
          message: captchaToken ? 'Mã captcha không đúng hoặc đã hết hạn' : 'Vui lòng nhập mã captcha',
          captchaRequired: true,
        });
      }
      // 1 captcha chỉ dùng được 1 lần -> không thể giải 1 lần rồi thử hàng loạt mật khẩu.
      if (!(await guard.danhDauCaptchaDaDung(ve.jti, ve.exp))) {
        return res.status(428).json({
          message: 'Mã captcha đã được sử dụng, vui lòng lấy mã mới',
          captchaRequired: true,
        });
      }
    }

    // 3) Xác thực với LMS
    let wstoken;
    try {
      wstoken = await moodle.getToken(username, password);
    } catch (err) {
      if (err.status !== 401) throw err; // lỗi mạng/LMS chết -> KHÔNG tính là sai mật khẩu

      const { canCaptcha: phaiNhapCaptcha, khoaTrongGiay } = await guard.ghiNhanDangNhapSai(
        username,
        ip
      );
      if (khoaTrongGiay > 0) {
        res.set('Retry-After', String(khoaTrongGiay));
        return res.status(429).json({
          message: `Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau ${khoaTrongGiay} giây`,
          locked: true,
          retryAfter: khoaTrongGiay,
        });
      }
      // Thông báo chung: không phân biệt sai tài khoản hay sai mật khẩu.
      return res.status(401).json({
        message: 'Sai tài khoản hoặc mật khẩu',
        captchaRequired: phaiNhapCaptcha,
      });
    }

    const info = await moodle.getSiteInfo(wstoken);
    await guard.xoaBoDem(username, ip); // đăng nhập đúng -> xóa sạch bộ đếm

    // Tạo thêm phiên web LMS (MoodleSession + sesskey) cho các API chỉ có ở lớp web
    // (xem lms.controller). Đây là lúc DUY NHẤT server còn giữ mật khẩu trong tay.
    // Chạy nền + nuốt lỗi: LMS đổi form đăng nhập hay chặn bot thì login vẫn phải thành công.
    moodle
      .webLogin(username, password)
      // userid parse từ HTML có thể thiếu tùy bản Moodle -> lấy từ wstoken làm chuẩn.
      .then((p) => phienWeb.luu(info.username, { ...p, userid: p.userid || info.userid }))
      .catch((e) => console.error('Không tạo được phiên web LMS:', e.message));

    // Ghi danh tính hiện tại vào cookie phiên -> đăng nhập tài khoản mới sẽ ghi đè
    // danh tính cũ, khiến vé phát (hls_*) của tài khoản trước không còn dùng được.
    setSid(res, info.username, req);
    res.json({ token: wstoken, user: mapUser(info) });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  -> kiểm tra wstoken còn sống và lấy lại thông tin SV
exports.me = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!wstoken) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    // getSiteInfo ném 401 nếu wstoken hết hạn -> rơi vào catch
    const info = await moodle.getSiteInfo(wstoken);
    setSid(res, info.username, req); // làm mới cookie phiên cho lần tải lại trang
    res.json({ user: mapUser(info) });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};

// POST /api/auth/logout  -> xóa cookie phiên (vé phát hls_* sẽ tự hết hạn theo TTL).
exports.logout = (req, res) => {
  // Bỏ luôn phiên web LMS đang giữ hộ, không để nó sống tới hết TTL sau khi SV thoát.
  const username = readSid(req);
  if (username) phienWeb.xoa(username);

  clearSid(res);
  res.json({ message: 'Đã đăng xuất' });
};
