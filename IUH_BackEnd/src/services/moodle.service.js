const axios = require('axios');
const https = require('https');

const MOODLE_BASE = process.env.MOODLE_URL || 'https://lms.iuh.edu.vn';
const MOODLE_SERVICE = process.env.MOODLE_SERVICE || 'moodle_mobile_app';

// Một số server LMS không gửi đủ chuỗi chứng chỉ (intermediate cert) -> Node báo
// "unable to verify the first certificate". Bật MOODLE_TLS_INSECURE=true để bỏ
// qua kiểm tra chứng chỉ (chỉ nên dùng cho nội bộ/dev).
const httpsAgent =
  process.env.MOODLE_TLS_INSECURE === 'true'
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

// axios instance dùng chung cho mọi request tới Moodle
const moodleHttp = axios.create({ httpsAgent });

/**
 * Đăng nhập Moodle bằng username/password, trả về wstoken.
 * Ném lỗi nếu sai tài khoản.
 */
async function getToken(username, password) {
  const res = await moodleHttp.post(
    `${MOODLE_BASE}/login/token.php`,
    new URLSearchParams({
      username,
      password,
      service: MOODLE_SERVICE,
    })
  );

  if (res.data.error || !res.data.token) {
    const err = new Error(res.data.error || 'Sai tài khoản hoặc mật khẩu LMS');
    err.status = 401;
    throw err;
  }
  return res.data.token;
}

/**
 * Lấy thông tin user từ wstoken (đồng thời dùng để kiểm tra token còn sống).
 * Nếu token hết hạn/không hợp lệ, Moodle trả về exception -> ta ném lỗi 401.
 */
async function getSiteInfo(wstoken) {
  const res = await moodleHttp.get(`${MOODLE_BASE}/webservice/rest/server.php`, {
    params: {
      wstoken,
      wsfunction: 'core_webservice_get_site_info',
      moodlewsrestformat: 'json',
    },
  });

  // Moodle trả lỗi dưới dạng { exception, errorcode, message }
  if (res.data.exception) {
    const err = new Error('wstoken không hợp lệ hoặc đã hết hạn');
    err.status = 401;
    throw err;
  }
  return res.data; // { userid, username, fullname, userpictureurl, ... }
}

/**
 * Lấy danh sách môn học (khoá học) mà SV đang tham gia.
 */
async function getUserCourses(wstoken, userid) {
  const res = await moodleHttp.get(`${MOODLE_BASE}/webservice/rest/server.php`, {
    params: {
      wstoken,
      wsfunction: 'core_enrol_get_users_courses',
      moodlewsrestformat: 'json',
      userid,
    },
  });

  if (res.data && res.data.exception) {
    const err = new Error(res.data.message || 'Không lấy được danh sách môn học');
    err.status = res.data.errorcode === 'invalidtoken' ? 401 : 400;
    throw err;
  }
  return Array.isArray(res.data) ? res.data : [];
}

module.exports = { getToken, getSiteInfo, getUserCourses };
