const moodle = require('../services/moodle.service');

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
    res.json({ user: mapUser(info) });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};
