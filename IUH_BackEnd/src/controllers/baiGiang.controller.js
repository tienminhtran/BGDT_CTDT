const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const baiGiang = require('../services/baiGiang.service');
const luotXem = require('../services/luotXem.service');
const moodle = require('../services/moodle.service');
const svhp = require('../services/sinhVienHocPhan.service');
const { encodeCourse, decodeCourse } = require('../utils/courseToken');
const { setSid, readSid } = require('../utils/sessionCookie');

// Danh tính ảo cho giảng viên (app dùng x-teacher-key, không đăng nhập LMS).
const TEACHER_SUBJECT = '__TEACHER__';

// TTL token phát HLS. Ngắn để hạn chế cửa sổ rò rỉ, nhưng đủ dài để xem hết 1 bài giảng.
// Nếu bài giảng dài hơn TTL và xem liên tục, tăng qua env HLS_TOKEN_TTL (vd '3h').
const HLS_TOKEN_TTL = process.env.HLS_TOKEN_TTL || '2h';

// Đặt token phát vào cookie HttpOnly (KHÔNG nằm trên URL) -> copy link không xem được.
// Scope theo path bài giảng: cookie chỉ được gửi cho đúng endpoint HLS của bài giảng đó.
// secure xét theo req.secure (kết nối thực tế), không hardcode theo NODE_ENV: server nội bộ
// vẫn chạy production qua http://<ip>:port (không TLS) -> cookie Secure sẽ bị trình duyệt bỏ qua.
function setHlsCookie(res, id, token, req) {
  const exp = jwt.decode(token)?.exp; // giây; đặt maxAge cookie khớp hạn token
  const maxAge = exp ? Math.max(0, exp * 1000 - Date.now()) : undefined;
  res.cookie(`hls_${id}`, token, {
    httpOnly: true,          // JS trang không đọc được -> khó trích xuất/chia sẻ
    sameSite: 'lax',
    secure: !!req?.secure,
    path: `/api/lectures/${id}/hls`,
    maxAge,
  });
}

// Đọc token phát từ cookie HttpOnly (không cần cookie-parser).
function readHlsCookie(req, id) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const name = `hls_${id}=`;
  for (const part of raw.split(';')) {
    const c = part.trim();
    if (c.startsWith(name)) return decodeURIComponent(c.slice(name.length));
  }
  return null;
}

// Lưu file tạm ra ổ đĩa (cần đường dẫn file cho ffmpeg đọc), xử lý xong sẽ xóa.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) =>
    cb(null, `upload_${Date.now()}${path.extname(file.originalname || '')}`),
});

const MAX_SIZE = (parseInt(process.env.MAX_VIDEO_MB, 10) || 2048) * 1024 * 1024; // mặc định 2GB

function fileFilter(req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith('video/')) return cb(null, true);
  cb(Object.assign(new Error('Chỉ chấp nhận file video'), { status: 400 }));
}

// Middleware multer cho 1 file field "video"
const uploadMiddleware = multer({ storage, limits: { fileSize: MAX_SIZE }, fileFilter }).single(
  'video'
);

// POST /api/lectures/:id/video  (field form-data: video)
exports.uploadVideo = async (req, res, next) => {
  const tempPath = req.file ? req.file.path : null;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Id bài giảng không hợp lệ' });
    }

    const result = await baiGiang.uploadVideoBaiGiang(id, req.file);
    res.json({ idBaiGiang: id, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  } finally {
    // Dọn file tạm do multer tạo
    if (tempPath) fs.rm(tempPath, { force: true }, () => {});
  }
};

exports.uploadMiddleware = uploadMiddleware;

// GET /api/lectures/:id/playback-token
// - Sinh viên: gửi Bearer wstoken (đăng nhập LMS).
// - Giảng viên (app port 5999): gửi header x-teacher-key = KEY_LOGIN_TEACHER, không cần đăng nhập.
// Cấp token ký ngắn hạn để xem HLS của bài giảng này.
exports.playbackToken = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Id bài giảng không hợp lệ' });
    }

    // App giảng viên: chỉ cần key hợp lệ, bỏ qua đăng nhập LMS.
    const teacherKey = req.headers['x-teacher-key'];
    const isTeacher =
      !!process.env.KEY_LOGIN_TEACHER && teacherKey === process.env.KEY_LOGIN_TEACHER;

    let viewer; // danh tính sẽ ghi vào vé phát (để streamHls đối chiếu với cookie phiên)
    if (isTeacher) {
      viewer = TEACHER_SUBJECT;
    } else {
      // 1) Phải đăng nhập LMS (token hợp lệ).
      const header = req.headers.authorization || '';
      const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!wstoken) return res.status(401).json({ message: 'Chưa đăng nhập' });
      const info = await moodle.getSiteInfo(wstoken); // ném 401 nếu token LMS hết hạn

      // Ghi danh tính hiện tại vào cookie phiên NGAY (kể cả trước khi kiểm quyền): nếu SV này
      // không có quyền, sid vẫn được cập nhật -> vé cũ của tài khoản khác trong browser vô hiệu.
      setSid(res, info.username, req);

      // 2) Phải thuộc học phần chứa môn của chính bài giảng này (chống gọi thẳng API).
      //    maTuQuan của bài giảng = MaMon dùng để đối chiếu tb_SinhVienHocPhan.
      const viTri = await baiGiang.getViTriBaiGiang(id); // ném 404 nếu bài giảng không tồn tại
      const { allowed } = await svhp.kiemTraSinhVienHocMon(info.username, viTri.maTuQuan);
      if (!allowed) {
        return res
          .status(403)
          .json({ message: 'Bạn không có quyền xem bài giảng của môn học này' });
      }
      viewer = info.username;
    }

    if (isTeacher) setSid(res, viewer, req);
    // Vé phát gắn cả bài giảng (bg) lẫn người xem (mssv) -> streamHls chặn dùng vé chéo tài khoản.
    const token = jwt.sign({ bg: id, mssv: viewer }, process.env.JWT_SECRET, {
      expiresIn: HLS_TOKEN_TTL,
    });
    setHlsCookie(res, id, token, req);
    // URL KHÔNG kèm token -> xác thực bằng cookie HttpOnly, copy link cho người ngoài sẽ 401.
    res.json({ url: `/api/lectures/${id}/hls/index.m3u8` });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/lectures/:id/teacher  (Header: x-teacher-key = KEY_LOGIN_TEACHER)
// Giảng viên xem 1 video riêng lẻ CHỈ BẰNG id (tb_BaiGiang) — không cần token khóa học.
// Trả metadata + token/url phát HLS trong 1 lần gọi.
exports.getBaiGiangTeacher = async (req, res, next) => {
  try {
    const teacherKey = req.headers['x-teacher-key'];
    if (!process.env.KEY_LOGIN_TEACHER || teacherKey !== process.env.KEY_LOGIN_TEACHER) {
      return res.status(401).json({ message: 'Key giảng viên không hợp lệ' });
    }

    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Id bài giảng không hợp lệ' });
    }

    const info = await baiGiang.getBaiGiangById(id); // ném 404 nếu không có

    // Chỉ cấp token/url phát khi đã có bản HLS.
    let token = null;
    let url = null;
    if (info.coHls) {
      setSid(res, TEACHER_SUBJECT, req); // gắn danh tính giảng viên vào cookie phiên
      token = jwt.sign({ bg: id, mssv: TEACHER_SUBJECT }, process.env.JWT_SECRET, {
        expiresIn: HLS_TOKEN_TTL,
      });
      setHlsCookie(res, id, token, req);
      url = `/api/lectures/${id}/hls/index.m3u8`; // token nằm ở cookie, không trên URL
    }

    res.json({ ...info, url });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/lectures/:id/hls/:file?token=<signed>
// Stream HLS qua backend (bucket private). Xác thực bằng token ký, không gọi LMS mỗi segment.
exports.streamHls = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    // Vé phát chỉ nằm ở cookie HttpOnly (không nhận qua URL -> không copy/paste được).
    const token = readHlsCookie(req, id);
    if (!token) return res.status(401).json({ message: 'Thiếu token, không thể phát video, vui lòng liên hệ Phòng Đào tạo' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    if (payload.bg !== id) {
      return res.status(403).json({ message: 'Token không khớp bài giảng' });
    }

    // Đối chiếu danh tính: vé này cấp cho ai (payload.mssv) phải trùng người ĐANG đăng nhập
    // trong browser (cookie sid). Chặn dùng vé còn sót của tài khoản khác trong cùng trình duyệt.
    const sid = readSid(req);
    if (!sid || sid !== payload.mssv) {
      return res.status(401).json({ message: 'Phiên không khớp, vui lòng đăng nhập lại' });
    }

    await baiGiang.streamHls(id, req.params.file, res);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/lectures?course=<token>
// Token mờ (AES) chứa mã môn + phiên bản -> giải phía server, KHÔNG lộ mã môn ra client.
exports.listVideos = async (req, res, next) => {
  try {
    const { course } = req.query;
    if (!course) return res.status(400).json({ message: 'Thiếu mã khóa học' });

    const { maMon, version } = decodeCourse(course); // ném 400 nếu token sai
    const { subjectName, videos } = await baiGiang.listVideos(maMon, version || null);
    // KHÔNG trả maMon ra client; chỉ trả tên môn (để hiển thị) + phiên bản.
    res.json({ subjectName, version: version || null, videos });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// POST /api/lectures/token  body: { courseCode, version }
// Sinh token mờ cho 1 khóa học để điều hướng/đặt URL mà không lộ mã môn.
exports.createCourseToken = async (req, res, next) => {
  try {
    const { courseCode, version } = req.body || {};
    if (!courseCode) return res.status(400).json({ message: 'Chưa nhập mã môn học' });
    if(!version) {
      return res.status(400).json({ message: 'Chưa nhập phiên bản' });
    }
    const token = encodeCourse({ maMon: String(courseCode), version: version ?? null });
    res.json({ token });
  } catch (err) {
    next(err);
  }
};

// POST /api/lectures/:id/view
// Client gửi bằng navigator.sendBeacon sau khi xem >= 3s. Chỉ cộng buffer RAM
// (có dedupe), KHÔNG đụng DB; cron sẽ gộp ghi. Luôn trả 204 (beacon bỏ qua body).
exports.tangLuotXem = (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isInteger(id) && id > 0) {
    const viewer = (req.body && req.body.v) || req.ip;
    luotXem.ghiNhanLuotXem(id, viewer);
  }
  res.status(204).end();
};

// GET /api/lectures/chapters?subjectVersionId=<id>
exports.listChiTiet = async (req, res, next) => {
  try {
    const versionId = parseInt(req.query.subjectVersionId, 10);
    if (!Number.isInteger(versionId)) {
      return res.status(400).json({ message: 'Thiếu hoặc sai subjectVersionId' });
    }
    const data = await baiGiang.listChiTietByVersion(versionId);
    res.json({ subjectVersionId: versionId, chiTiet: data });
  } catch (err) {
    next(err);
  }
};

// POST /api/lectures/chapters/:chapterId/ensure -> tạo (nếu chưa có) & trả baiGiangId
exports.ensureBaiGiang = async (req, res, next) => {
  try {
    const chapterId = parseInt(req.params.chapterId, 10);
    if (!Number.isInteger(chapterId)) {
      return res.status(400).json({ message: 'chapterId không hợp lệ' });
    }
    const baiGiangId = await baiGiang.getOrCreateBaiGiang(chapterId);
    res.json({ chapterId, baiGiangId });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};


// DELETE /api/lectures/:id/video  (Header: x-teacher-key = KEY_LOGIN_TEACHER)
// Xóa video bài giảng theo id: dọn toàn bộ stream/ + chunk/ trên MinIO và xóa link trong DB.
exports.deleteVideo = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Id bài giảng không hợp lệ' });
    }

    const teacherKey = req.headers['x-teacher-key'];
    if (!process.env.KEY_LOGIN_TEACHER || teacherKey !== process.env.KEY_LOGIN_TEACHER) {
      return res.status(401).json({ message: 'Key giảng viên không hợp lệ' });
    }

    const result = await baiGiang.deleteVideo(id, teacherKey);
    res.json({ idBaiGiang: id, ...result });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/lectures/:id/upload-status  (Header: x-api-key)
// Kiểm tra trước khi upload: thư mục stream/chunk của bài giảng đang ở trạng thái nào.
//   - 200 + status='empty'      : chưa có video      -> canUpload=true, được upload
//   - 200 + status='processing' : đã có video, chunk chưa xong -> "Video đang xử lý"
//   - 200 + status='completed'  : đã có video + chunk hoàn chỉnh -> đã upload xong
exports.uploadStatus = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Id bài giảng không hợp lệ' });
    }
    const trangThai = await baiGiang.kiemTraTrangThaiUpload(id);
    res.json({ idBaiGiang: id, ...trangThai });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};
