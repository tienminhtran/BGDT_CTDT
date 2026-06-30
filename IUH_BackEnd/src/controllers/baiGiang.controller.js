const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const baiGiang = require('../services/baiGiang.service');
const moodle = require('../services/moodle.service');
const { encodeCourse, decodeCourse } = require('../utils/courseToken');

const HLS_TOKEN_TTL = process.env.HLS_TOKEN_TTL || '6h';

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

    if (!isTeacher) {
      const header = req.headers.authorization || '';
      const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
      if (!wstoken) return res.status(401).json({ message: 'Chưa đăng nhập' });
      await moodle.getSiteInfo(wstoken); // ném 401 nếu token LMS hết hạn
    }

    const token = jwt.sign({ bg: id }, process.env.JWT_SECRET, {
      expiresIn: HLS_TOKEN_TTL,
    });
    res.json({ token, url: `/api/lectures/${id}/hls/index.m3u8?token=${token}` });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ message: err.message });
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
      token = jwt.sign({ bg: id }, process.env.JWT_SECRET, { expiresIn: HLS_TOKEN_TTL });
      url = `/api/lectures/${id}/hls/index.m3u8?token=${token}`;
    }

    res.json({ ...info, token, url });
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
    const token = req.query.token;
    if (!token) return res.status(401).json({ message: 'Thiếu token' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    if (payload.bg !== id) {
      return res.status(403).json({ message: 'Token không khớp bài giảng' });
    }

    await baiGiang.streamHls(id, req.params.file, token, res);
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
