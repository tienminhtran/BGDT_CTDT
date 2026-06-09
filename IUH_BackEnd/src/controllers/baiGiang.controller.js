const fs = require('fs');
const os = require('os');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');

const baiGiang = require('../services/baiGiang.service');
const moodle = require('../services/moodle.service');

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

// POST /api/baigiang/:id/upload-video  (field form-data: video)
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

// GET /api/baigiang/:id/playback-token  (Bearer wstoken)
// Phải đăng nhập LMS -> cấp token ký ngắn hạn để xem HLS của bài giảng này.
exports.playbackToken = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!wstoken) return res.status(401).json({ message: 'Chưa đăng nhập' });

    await moodle.getSiteInfo(wstoken); // ném 401 nếu token LMS hết hạn

    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Id bài giảng không hợp lệ' });
    }

    const token = jwt.sign({ bg: id }, process.env.JWT_SECRET, {
      expiresIn: HLS_TOKEN_TTL,
    });
    res.json({ token, url: `/api/baigiang/${id}/hls/index.m3u8?token=${token}` });
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ message: err.message });
    next(err);
  }
};

// GET /api/baigiang/:id/hls/:file?token=<signed>
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

// GET /api/baigiang/danh-sach?maMon=<ma_tuquan>&version=<version>
exports.listVideos = async (req, res, next) => {
  try {
    const { maMon, version } = req.query;
    if (!maMon) return res.status(400).json({ message: 'Thiếu maMon' });
    const videos = await baiGiang.listVideos(maMon, version || null);
    res.json({ maMon, version: version || null, videos });
  } catch (err) {
    next(err);
  }
};

// GET /api/baigiang/chi-tiet?monHocVersionId=<id>
exports.listChiTiet = async (req, res, next) => {
  try {
    const versionId = parseInt(req.query.monHocVersionId, 10);
    if (!Number.isInteger(versionId)) {
      return res.status(400).json({ message: 'Thiếu hoặc sai monHocVersionId' });
    }
    const data = await baiGiang.listChiTietByVersion(versionId);
    res.json({ monHocVersionId: versionId, chiTiet: data });
  } catch (err) {
    next(err);
  }
};

// POST /api/baigiang/chi-tiet/:chiTietId/ensure -> tạo (nếu chưa có) & trả baiGiangId
exports.ensureBaiGiang = async (req, res, next) => {
  try {
    const chiTietId = parseInt(req.params.chiTietId, 10);
    if (!Number.isInteger(chiTietId)) {
      return res.status(400).json({ message: 'chiTietId không hợp lệ' });
    }
    const baiGiangId = await baiGiang.getOrCreateBaiGiang(chiTietId);
    res.json({ chiTietId, baiGiangId });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};
