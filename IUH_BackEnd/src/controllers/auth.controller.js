const moodle = require('../services/moodle.service');
const { setSid, clearSid } = require('../utils/sessionCookie');

function mapUser(info) {
  return {
    moodleId: info.userid,
    username: info.username,
    fullname: info.fullname,
  };
}

// POST /api/auth/login  -> đăng nhập bằng tài khoản LMS (popup)
// Trả về wstoken (dùng làm phiên) + thông tin SV. Không lưu DB.
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Thiếu tài khoản hoặc mật khẩu' });
    }

    const wstoken = await moodle.getToken(username, password);
    const info = await moodle.getSiteInfo(wstoken);

    // Ghi danh tính hiện tại vào cookie phiên -> đăng nhập tài khoản mới sẽ ghi đè
    // danh tính cũ, khiến vé phát (hls_*) của tài khoản trước không còn dùng được.
    setSid(res, info.username);
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
    setSid(res, info.username); // làm mới cookie phiên cho lần tải lại trang
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
  clearSid(res);
  res.json({ message: 'Đã đăng xuất' });
};
