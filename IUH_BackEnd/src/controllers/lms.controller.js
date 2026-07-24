const moodle = require('../services/moodle.service');
const phienWeb = require('../services/moodleSession.service');
const guard = require('../services/loginGuard.service');
const captcha = require('../services/captcha.service');

/**
 * Cầu nối tới các API "giao diện web" của Moodle (/lib/ajax/service.php).
 *
 * FE không tự gọi LMS được (CORS chặn đọc phản hồi + tab app không có cookie LMS),
 * nên mọi thứ đi qua đây: FE gửi Bearer wstoken như các route khác, server tra ra
 * phiên web đã tạo sẵn lúc đăng nhập (xem auth.controller) rồi gọi hộ.
 */

// Danh sách methodname FE được phép gọi. KHÔNG mở tự do: phiên web có toàn quyền
// của SV trên LMS, để lọt method ghi dữ liệu là FE (hoặc ai chỉnh request) thao tác
// được lên tài khoản LMS thật.
const CHO_PHEP = new Set(
  (process.env.MOODLE_AJAX_METHODS ||
    'core_course_get_recent_courses,core_course_get_enrolled_courses_by_timeline_classification')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function layWstoken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

// Xác thực wstoken -> trả phiên web tương ứng. Ném lỗi có status nếu không có.
async function layPhien(req) {
  const wstoken = layWstoken(req);
  if (!wstoken) {
    const err = new Error('Tài khoản chưa đăng nhập');
    err.status = 401;
    throw err;
  }

  const info = await moodle.getSiteInfo(wstoken); // ném 401 nếu wstoken hết hạn
  const phien = phienWeb.lay(info.username);
  if (!phien) {
    // Phiên web hết hạn/chưa tạo được. Không có mật khẩu để tự đăng nhập lại
    // -> báo mã riêng để FE biết phải mời SV đăng nhập lại (khác 401 wstoken hỏng).
    const err = new Error('Phiên web LMS không còn hiệu lực, vui lòng đăng nhập lại');
    err.status = 409;
    err.code = 'NO_WEB_SESSION';
    throw err;
  }
  return { username: info.username, phien };
}

// GET /api/lms/sesskey -> { sesskey, userid }
exports.sesskey = async (req, res, next) => {
  try {
    const { phien } = await layPhien(req);
    res.json({ sesskey: phien.sesskey, userid: phien.userid });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message, code: err.code });
    }
    next(err);
  }
};

// GET /api/lms/change-password/status -> FE biết trước có phải hiện ô captcha không,
// để mở modal là hiện sẵn thay vì đợi bấm Lưu mới lòi ra.
exports.changePasswordStatus = async (req, res, next) => {
  try {
    const { username } = await layPhien(req);
    res.json({ captchaRequired: await guard.canCaptchaDoiMatKhau(username) });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message, code: err.code });
    }
    next(err);
  }
};

// POST /api/lms/change-password  { oldPassword, newPassword, captchaToken?, captchaText? }
// Đổi mật khẩu LMS thật (không có bảng mật khẩu riêng trong hệ thống này).
//
// Chống dò mật khẩu cũ: sai >= CHANGE_PWD_CAPTCHA_THRESHOLD (mặc định 2) lần thì
// các lần sau bắt buộc kèm captcha đúng. Captcha được kiểm TRƯỚC khi gọi LMS ->
// thiếu/sai captcha thì không tốn 1 lượt thử mật khẩu trên LMS, và trả 428 mà
// KHÔNG tăng bộ đếm (gõ nhầm captcha không nên bị tính là đoán sai mật khẩu).
exports.changePassword = async (req, res, next) => {
  let username;
  try {
    const { oldPassword, newPassword, captchaToken, captchaText } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Thiếu mật khẩu cũ hoặc mật khẩu mới' });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới phải khác mật khẩu cũ' });
    }

    const ctx = await layPhien(req);
    username = ctx.username;

    // 1) Cổng captcha — kiểm tra xong mới đụng tới LMS.
    if (await guard.canCaptchaDoiMatKhau(username)) {
      let ve;
      try {
        ve = captcha.kiemTraCaptcha(captchaToken, captchaText);
      } catch (_) {
        return res.status(428).json({
          message: captchaToken
            ? 'Mã captcha không đúng hoặc đã hết hạn'
            : 'Vui lòng nhập mã captcha',
          captchaRequired: true,
        });
      }
      // 1 captcha chỉ dùng 1 lần -> không giải 1 lần rồi thử hàng loạt mật khẩu.
      if (!(await guard.danhDauCaptchaDaDung(ve.jti, ve.exp))) {
        return res.status(428).json({
          message: 'Mã captcha đã được sử dụng, vui lòng lấy mã mới',
          captchaRequired: true,
        });
      }
    }

    // 2) Đổi mật khẩu trên LMS.
    try {
      await moodle.changePassword({
        cookie: ctx.phien.cookie,
        sesskey: ctx.phien.sesskey,
        username,
        oldPassword,
        newPassword,
      });
    } catch (err) {
      if (err.status !== 400) throw err; // lỗi mạng/phiên chết -> không tính là sai
      const phaiNhapCaptcha = await guard.ghiNhanDoiMatKhauSai(username);
      return res.status(400).json({ message: err.message, captchaRequired: phaiNhapCaptcha });
    }

    await guard.xoaBoDemDoiMatKhau(username);

    // Moodle hủy mọi phiên web của user sau khi đổi mật khẩu -> cookie đang giữ đã chết,
    // và wstoken FE cầm cũng không nên dùng tiếp. Xóa cache, buộc đăng nhập lại.
    phienWeb.xoa(username);
    res.json({ message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại', relogin: true });
  } catch (err) {
    if (err.status === 401 && username) phienWeb.xoa(username);
    if (err.status) {
      return res.status(err.status).json({ message: err.message, code: err.code });
    }
    next(err);
  }
};

// POST /api/lms/ajax  { methodname, args } -> data trả về từ Moodle
exports.ajax = async (req, res, next) => {
  let username;
  try {
    const { methodname, args } = req.body || {};
    if (!methodname) {
      return res.status(400).json({ message: 'Thiếu methodname' });
    }
    if (!CHO_PHEP.has(methodname)) {
      return res.status(403).json({ message: `Không cho phép gọi ${methodname}` });
    }

    const ctx = await layPhien(req);
    username = ctx.username;
    const { phien } = ctx;

    // userid luôn lấy từ phiên server, không nhận từ FE -> không gọi thay người khác.
    const data = await moodle.callAjax({
      cookie: phien.cookie,
      sesskey: phien.sesskey,
      methodname,
      args: { ...args, userid: phien.userid },
    });
    res.json({ data });
  } catch (err) {
    if (err.status === 401 && username) phienWeb.xoa(username); // phiên chết -> bỏ cache
    if (err.status) {
      return res.status(err.status).json({ message: err.message, code: err.code });
    }
    next(err);
  }
};
