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

// Moodle chặn/đổi hành vi với một số user-agent lạ -> giả lập trình duyệt cho các
// request "giao diện web" (login/index.php, /my/). Không ảnh hưởng webservice REST.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

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

/* ------------------------------------------------------------------ *
 * PHIÊN WEB (MoodleSession + sesskey)
 *
 * wstoken ở trên chỉ gọi được /webservice/rest/server.php. Một số API chỉ có ở
 * lớp giao diện web (/lib/ajax/service.php, vd core_course_get_recent_courses)
 * và bắt buộc 2 thứ: cookie MoodleSession + sesskey (token chống CSRF của Moodle,
 * nhúng trong M.cfg của mọi trang HTML khi đã đăng nhập).
 *
 * Trình duyệt KHÔNG tự lấy được sesskey giúp ta: fetch('https://lms.iuh.edu.vn/my/')
 * từ FE bị CORS chặn đọc nội dung (Moodle không trả Access-Control-Allow-Origin),
 * và cookie LMS cũng không tồn tại trong tab của app. Vì vậy server phải tự đăng
 * nhập web một lần lúc SV login rồi giữ phiên hộ.
 * ------------------------------------------------------------------ */

// Gộp các cookie từ header Set-Cookie vào kho (dạng { ten: giaTri }).
function luuCookie(kho, setCookie) {
  for (const raw of setCookie || []) {
    const cap = String(raw).split(';')[0];
    const i = cap.indexOf('=');
    if (i <= 0) continue;
    const ten = cap.slice(0, i).trim();
    const giaTri = cap.slice(i + 1).trim();
    if (!giaTri || giaTri === 'deleted') delete kho[ten];
    else kho[ten] = giaTri;
  }
  return kho;
}

// Kho cookie -> chuỗi cho header Cookie.
function chuoiCookie(kho) {
  return Object.entries(kho)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function loi401(message) {
  const err = new Error(message);
  err.status = 401;
  return err;
}

/**
 * Đọc M.cfg trong HTML một trang Moodle.
 *
 * KHÔNG được coi "có sesskey" là "đã đăng nhập": lms.iuh.edu.vn cấp sesskey cho cả
 * khách vãng lai, và /my/ khi chưa đăng nhập thì âm thầm đá về /login/index.php
 * (vẫn HTTP 200). Dấu hiệu chắc chắn: M.cfg có userId > 0, hoặc trang có link
 * đăng xuất (dự phòng cho bản Moodle không xuất userId).
 */
function docMcfg(html) {
  const s = String(html || '');
  const userid = Number(s.match(/"userId"\s*:\s*(\d+)/)?.[1] || 0);
  return {
    sesskey: s.match(/"sesskey"\s*:\s*"([^"]+)"/)?.[1] || null,
    userid,
    daDangNhap: userid > 0 || /login\/logout\.php/.test(s),
  };
}

/**
 * Lấy sesskey từ một cookie phiên web đang sống.
 * @param {string} cookieHeader vd 'MoodleSession=abc; MOODLEID1_=xyz'
 * @returns {Promise<string>} sesskey
 */
async function getSesskey(cookieHeader) {
  const res = await moodleHttp.get(`${MOODLE_BASE}/my/`, {
    headers: { Cookie: cookieHeader, 'User-Agent': UA },
    responseType: 'text',
    transformResponse: [(d) => d],
  });

  const { sesskey, daDangNhap } = docMcfg(res.data);
  if (!daDangNhap || !sesskey) throw loi401('Phiên LMS đã hết hạn');
  return sesskey;
}

/**
 * Đăng nhập vào giao diện web LMS bằng username/password để lấy phiên web.
 * @returns {Promise<{cookie:string, sesskey:string, userid:number}>}
 */
async function webLogin(username, password) {
  const kho = {};

  // 1) Mở trang đăng nhập: nhận MoodleSession rỗng + logintoken (chống CSRF).
  const form = await moodleHttp.get(`${MOODLE_BASE}/login/index.php`, {
    headers: { 'User-Agent': UA },
    responseType: 'text',
    transformResponse: [(d) => d],
  });
  luuCookie(kho, form.headers['set-cookie']);
  const logintoken = String(form.data).match(
    /name="logintoken"[^>]*value="([^"]*)"/
  )?.[1];

  // 2) Nộp form. Moodle trả 303 và cấp MoodleSession MỚI (chống session fixation)
  //    -> phải chặn axios tự đi theo redirect, nếu không mất header Set-Cookie này.
  const post = await moodleHttp.post(
    `${MOODLE_BASE}/login/index.php`,
    new URLSearchParams({
      username,
      password,
      logintoken: logintoken || '',
      anchor: '',
    }),
    {
      headers: {
        Cookie: chuoiCookie(kho),
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
      responseType: 'text',
      transformResponse: [(d) => d],
    }
  );
  luuCookie(kho, post.headers['set-cookie']);

  // 3) Vào /my/ bằng cookie mới: sai mật khẩu thì Moodle đá về trang login,
  //    khi đó userId = 0 -> getSesskey ném 401.
  const cookie = chuoiCookie(kho);
  const trang = await moodleHttp.get(`${MOODLE_BASE}/my/`, {
    headers: { Cookie: cookie, 'User-Agent': UA },
    responseType: 'text',
    transformResponse: [(d) => d],
  });
  luuCookie(kho, trang.headers['set-cookie']);

  const { sesskey, userid, daDangNhap } = docMcfg(trang.data);
  if (!daDangNhap || !sesskey) throw loi401('Sai tài khoản/mật khẩu hoặc LMS đổi form đăng nhập');

  return { cookie: chuoiCookie(kho), sesskey, userid };
}

/**
 * Gọi một web service nội bộ của Moodle qua /lib/ajax/service.php.
 * @returns {Promise<any>} phần `data` của phần tử đầu tiên
 */
async function callAjax({ cookie, sesskey, methodname, args = {} }) {
  const res = await moodleHttp.post(
    `${MOODLE_BASE}/lib/ajax/service.php`,
    [{ index: 0, methodname, args }],
    {
      params: { sesskey, info: methodname },
      headers: {
        Cookie: cookie,
        'User-Agent': UA,
        'Content-Type': 'application/json',
      },
    }
  );

  // Moodle trả về mảng: [{ error, exception, data }]
  const item = Array.isArray(res.data) ? res.data[0] : res.data;
  if (!item) throw new Error(`Không có phản hồi cho ${methodname}`);
  if (item.error) {
    const code = item.exception?.errorcode;
    // sesskey sai / phiên hết hạn -> để tầng trên xóa cache và bắt đăng nhập lại
    if (code === 'invalidsesskey' || code === 'requireloginerror') {
      throw loi401('Phiên LMS đã hết hạn');
    }
    const err = new Error(item.exception?.message || `Lỗi khi gọi ${methodname}`);
    err.status = 400;
    throw err;
  }
  return item.data;
}

// Gỡ thẻ HTML + giải mã entity để lấy câu thông báo lỗi thuần văn bản.
// Phải xử lý entity dạng số (&#7853; &#x1EAD;) vì thông báo tiếng Việt của Moodle
// khi bị mã hóa sẽ ra toàn dấu tiếng Việt -> không giải mã là hiện ra rác.
function locChu(html) {
  return String(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, so) => String.fromCodePoint(Number(so)))
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&') // giải mã cuối cùng, tránh tạo ra entity giả từ &amp;#39;
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tìm thông báo lỗi Moodle gắn vào ô nhập của form đổi mật khẩu.
 * Trả về chính câu tiếng Việt của LMS (vd "Mật khẩu hiện tại không đúng",
 * hay các yêu cầu về độ dài/ký tự) -> FE hiển thị nguyên văn, không cần tự dịch.
 */
function docLoiForm(html) {
  const s = String(html || '');

  // Moodle vẽ sẵn 1 div thông báo RỖNG cho MỌI ô, kể cả khi không có lỗi -> phải duyệt
  // hết và lấy div đầu tiên CÓ chữ, không được dừng ở div khớp đầu tiên.
  const mau = [
    /id="id_error_(?:password|newpassword1|newpassword2)"[^>]*>([\s\S]*?)<\/div>/g,
    /class="[^"]*invalid-feedback[^"]*"[^>]*>([\s\S]*?)<\/div>/g,
  ];
  for (const re of mau) {
    for (const m of s.matchAll(re)) {
      const chu = locChu(m[1]);
      if (chu) return chu;
    }
  }
  return null;
}

/**
 * Đổi mật khẩu LMS qua form /login/change_password.php (Moodle không có
 * webservice cho việc này -> phải dùng phiên web + sesskey).
 *
 * Ném lỗi kèm status nếu thất bại; trả về true nếu đổi thành công.
 */
async function changePassword({ cookie, sesskey, username, oldPassword, newPassword }) {
  const res = await moodleHttp.post(
    `${MOODLE_BASE}/login/change_password.php`,
    new URLSearchParams({
      id: '1', // id khoá học ngữ cảnh; 1 = trang chủ site
      sesskey,
      _qf__login_change_password_form: '1',
      password: oldPassword,
      newpassword1: newPassword,
      newpassword2: newPassword,
      submitbutton: 'Lưu những thay đổi',
    }),
    {
      headers: {
        Cookie: cookie,
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: `${MOODLE_BASE}/login/change_password.php`,
      },
      maxRedirects: 0,
      validateStatus: (s) => s < 400,
      responseType: 'text',
      transformResponse: [(d) => d],
    }
  );

  // Form sai (mật khẩu cũ sai, mật khẩu mới không đạt chính sách...) -> Moodle vẽ
  // lại form kèm lỗi ngay tại ô nhập.
  const loi = docLoiForm(res.data);
  if (loi) {
    const err = new Error(loi);
    err.status = 400;
    throw err;
  }

  // Không thấy lỗi CHƯA chắc là xong: tuỳ phiên bản, Moodle có thể trả 303, có thể
  // trả trang "đã đổi mật khẩu". Thay vì đoán qua HTML, xác minh bằng hành vi thật:
  // đăng nhập lại bằng mật khẩu MỚI, được token là chắc chắn đã đổi.
  try {
    await getToken(username, newPassword);
  } catch (_) {
    const err = new Error('LMS không chấp nhận đổi mật khẩu, vui lòng thử lại');
    err.status = 400;
    throw err;
  }
  return true;
}

module.exports = {
  getToken,
  getSiteInfo,
  getUserCourses,
  getSesskey,
  webLogin,
  callAjax,
  changePassword,
};
