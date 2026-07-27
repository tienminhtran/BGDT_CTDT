const lichSu = require('../services/lichSuThayDoiBaiGiang.service');

// Các hành động hợp lệ khi ghi nhật ký (khớp bộ cột trong tb_LichSuThayDoiBaiGiang).
const HANH_DONG = ['tao', 'sua', 'xoa'];

function parseLectureId(req) {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) {
    const err = new Error('Id bài giảng không hợp lệ');
    err.status = 400;
    throw err;
  }
  return id;
}

// POST /api/lecture-history/:id  (x-teacher-key)
// body: { hanhDong: 'tao'|'sua'|'xoa', maNguoi, lyDo? }
// UI gọi ngay sau khi upload/xóa video thành công: maNguoi do UI truyền xuống,
// DiaChiIP backend tự lấy từ request (không tin IP do client khai).
exports.ghi = async (req, res, next) => {
  try {
    const id = parseLectureId(req);
    const { hanhDong, maNguoi, lyDo } = req.body || {};

    if (!HANH_DONG.includes(hanhDong)) {
      return res.status(400).json({ message: "hanhDong phải là 'tao', 'sua' hoặc 'xoa'" });
    }
    if (!maNguoi || !String(maNguoi).trim()) {
      return res.status(400).json({ message: 'Thiếu mã người thao tác (maNguoi)' });
    }

    const row = await lichSu.ghiLichSu(id, hanhDong, { maNguoi, lyDo, req });
    if (!row) {
      return res.status(500).json({ message: 'Ghi nhật ký thất bại' });
    }
    res.status(201).json({ message: 'Đã ghi nhật ký', id: row.Id, idBaiGiang: id, hanhDong });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/lecture-history  (x-teacher-key)  ?limit=<n>
// Toàn bộ nhật ký (mọi bài giảng) kèm tên bài giảng + môn/phiên bản — màn "Lịch sử thay đổi"
// tải 1 lần rồi tự lọc/phân trang phía client (giống các màn quản lý khác).
exports.tatCa = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10);
    const items = await lichSu.danhSachTatCa({ limit });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

// GET /api/lecture-history/:id  (x-teacher-key)
// Nhật ký thao tác của 1 bài giảng, mới nhất trước.
exports.danhSach = async (req, res, next) => {
  try {
    const id = parseLectureId(req);
    const items = await lichSu.danhSachTheoBaiGiang(id);
    res.json({ idBaiGiang: id, items });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};
