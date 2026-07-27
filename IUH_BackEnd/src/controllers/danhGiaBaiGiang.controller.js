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

// Chuẩn hóa các query param lọc cho GET /api/reviews/my. Bỏ qua field trống/không hợp lệ.
function parseReviewFilters(query = {}) {
  const filters = {};
  const trim = (v) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const toStar = (v) => {
    const n = parseInt(v, 10);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
  };

  const courseName = trim(query.courseName);
  const courseCode = trim(query.courseCode);
  const videoTitle = trim(query.videoTitle);
  if (courseName) filters.courseName = courseName;
  if (courseCode) filters.courseCode = courseCode;
  if (videoTitle) filters.videoTitle = videoTitle;

  const stars = toStar(query.stars);
  const starsFrom = toStar(query.starsFrom);
  const starsTo = toStar(query.starsTo);
  if (stars != null) filters.stars = stars;
  if (starsFrom != null) filters.starsFrom = starsFrom;
  if (starsTo != null) filters.starsTo = starsTo;

  // dateFrom/dateTo dạng 'YYYY-MM-DD' -> Date bao trọn ngày (giờ địa phương của server).
  const dateFrom = trim(query.dateFrom);
  const dateTo = trim(query.dateTo);
  if (dateFrom) {
    const d = new Date(`${dateFrom}T00:00:00`);
    if (!Number.isNaN(d.getTime())) filters.dateFrom = d;
  }
  if (dateTo) {
    const d = new Date(`${dateTo}T23:59:59.999`);
    if (!Number.isNaN(d.getTime())) filters.dateTo = d;
  }

  return filters;
}

// Chuẩn hóa phân trang cho GET /api/reviews/my.
// pageSize chỉ nhận các mức cho phép (mặc định 15); page >= 1 (mặc định 1).
const PAGE_SIZES = [15, 50, 100, 200, 300];
function parsePagination(query = {}) {
  let pageSize = parseInt(query.pageSize, 10);
  if (!PAGE_SIZES.includes(pageSize)) pageSize = 15;
  let page = parseInt(query.page, 10);
  if (!Number.isInteger(page) || page < 1) page = 1;
  return { page, pageSize };
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
    const filters = parseReviewFilters(req.query);
    const pagination = parsePagination(req.query);
    const result = await danhGia.getDanhSachDanhGiaCuaSinhVien(studentId, filters, pagination);
    res.json(result); // { reviews, total, page, pageSize, totalPages }
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

// GET /api/reviews/overview  (x-teacher-key)
// Thống kê theo phiên bản môn: số video, tổng lượt xem, sao trung bình.
exports.tongQuan = async (req, res, next) => {
  try {
    res.json({ items: await danhGia.thongKeTheoPhienBan() });
  } catch (err) {
    next(err);
  }
};

// GET /api/reviews/overview/:versionId/comments  (x-teacher-key)
// Danh sách bình luận của 1 phiên bản môn -> FE xuất ra Excel.
exports.binhLuanTheoPhienBan = async (req, res, next) => {
  try {
    const items = await danhGia.danhSachBinhLuanTheoPhienBan(req.params.versionId);
    res.json({ items });
  } catch (err) {
    next(err);
  }
};
