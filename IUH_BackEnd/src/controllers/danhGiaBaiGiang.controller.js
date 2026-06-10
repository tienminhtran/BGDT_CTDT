const moodle = require('../services/moodle.service');
const danhGia = require('../services/danhGiaBaiGiang.service');

// Lấy MSSV từ wstoken LMS (Bearer). Ném 401 nếu thiếu/hết hạn token.
async function layMssv(req) {
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

function parseBaiGiangId(req) {
  const id = parseInt(req.params.baiGiangId ?? req.params.id, 10);
  if (!Number.isInteger(id)) {
    const err = new Error('Id bài giảng không hợp lệ');
    err.status = 400;
    throw err;
  }
  return id;
}

// POST /api/danhgia/:baiGiangId  (Bearer wstoken)  body: { soSao, binhLuan }
// SV bình luận + đánh giá sao cho 1 bài giảng (mỗi SV 1 lần/bài giảng).
exports.tao = async (req, res, next) => {
  try {
    const baiGiangId = parseBaiGiangId(req);
    const mssv = await layMssv(req);
    const { soSao, binhLuan } = req.body || {};

    const data = await danhGia.taoDanhGia(baiGiangId, mssv, { soSao, binhLuan });
    res.status(201).json({ message: 'Đánh giá thành công', danhGia: data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// PUT /api/danhgia/:baiGiangId  (Bearer wstoken)  body: { soSao?, binhLuan? }
// SV sửa đánh giá/bình luận của chính mình cho bài giảng.
exports.sua = async (req, res, next) => {
  try {
    const baiGiangId = parseBaiGiangId(req);
    const mssv = await layMssv(req);
    const { soSao, binhLuan } = req.body || {};

    const data = await danhGia.suaDanhGia(baiGiangId, mssv, { soSao, binhLuan });
    res.json({ message: 'Cập nhật đánh giá thành công', danhGia: data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/danhgia/:baiGiangId?page=&pageSize=
// Danh sách bình luận + sao của bài giảng kèm thống kê (công khai).
exports.danhSach = async (req, res, next) => {
  try {
    const baiGiangId = parseBaiGiangId(req);
    const { page, pageSize } = req.query;
    const data = await danhGia.getDanhGiaByBaiGiang(baiGiangId, { page, pageSize });
    res.json({ baiGiangId, ...data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/danhgia/:baiGiangId/sinh-vien  (Bearer wstoken)
// Lấy đánh giá của chính SV cho bài giảng (để FE prefill form), null nếu chưa có.
exports.cuaToi = async (req, res, next) => {
  try {
    const baiGiangId = parseBaiGiangId(req);
    const mssv = await layMssv(req);
    const data = await danhGia.getDanhGiaCuaSinhVien(baiGiangId, mssv);
    res.json({ baiGiangId, mssv, danhGia: data });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};
