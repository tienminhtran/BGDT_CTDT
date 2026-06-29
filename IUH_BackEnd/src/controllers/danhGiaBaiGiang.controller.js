const moodle = require('../services/moodle.service');
const danhGia = require('../services/danhGiaBaiGiang.service');

// Lấy MSSV từ wstoken LMS (Bearer). Ném 401 nếu thiếu/hết hạn token.
async function getStudentId(req) {
  const header = req.headers.authorization || '';
  const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!wstoken) {
    const err = new Error('Chưa đăng nhập');
    err.status = 401;
    throw err;
  }
  const info = await moodle.getSiteInfo(wstoken); // ném 401 nếu token hết hạn
  return info.username;
}

function parseLectureId(req) {
  const id = parseInt(req.params.lectureId, 10);
  if (!Number.isInteger(id)) {
    const err = new Error('Id bài giảng không hợp lệ');
    err.status = 400;
    throw err;
  }
  return id;
}

// POST /api/reviews/:lectureId  (Bearer wstoken)  body: { stars, comment }
// SV bình luận + đánh giá sao cho 1 bài giảng (mỗi SV 1 lần/bài giảng).
exports.tao = async (req, res, next) => {
  try {
    const lectureId = parseLectureId(req);
    const studentId = await getStudentId(req);
    const { stars, comment } = req.body || {};

    const review = await danhGia.taoDanhGia(lectureId, studentId, { stars, comment });
    res.status(201).json({ message: 'Đánh giá thành công', review });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// PUT /api/reviews/:lectureId  (Bearer wstoken)  body: { stars?, comment? }
// SV sửa đánh giá/bình luận của chính mình cho bài giảng.
exports.sua = async (req, res, next) => {
  try {
    const lectureId = parseLectureId(req);
    const studentId = await getStudentId(req);
    const { stars, comment } = req.body || {};

    const review = await danhGia.suaDanhGia(lectureId, studentId, { stars, comment });
    res.json({ message: 'Cập nhật đánh giá thành công', review });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/reviews/:lectureId
// Thống kê đánh giá tổng hợp của bài giảng (công khai). KHÔNG trả đánh giá từng SV.
exports.danhSach = async (req, res, next) => {
  try {
    const lectureId = parseLectureId(req);
    const data = await danhGia.getThongKeDanhGia(lectureId);
    res.json({ lectureId, ...data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/reviews/my  (Bearer wstoken)
// Danh sách TẤT CẢ đánh giá/bình luận của chính SV đang đăng nhập (kèm tên môn + bài giảng).
exports.cuaToiTatCa = async (req, res, next) => {
  try {
    const studentId = await getStudentId(req); // 401 nếu chưa đăng nhập
    const reviews = await danhGia.getDanhSachDanhGiaCuaSinhVien(studentId);
    res.json({ reviews });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/reviews/:lectureId/mine  (Bearer wstoken)
// Lấy đánh giá của chính SV cho bài giảng (để FE prefill form), null nếu chưa có.
exports.cuaToi = async (req, res, next) => {
  try {
    const lectureId = parseLectureId(req);
    const studentId = await getStudentId(req);
    const review = await danhGia.getDanhGiaCuaSinhVien(lectureId, studentId);
    res.json({ lectureId, review });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};
