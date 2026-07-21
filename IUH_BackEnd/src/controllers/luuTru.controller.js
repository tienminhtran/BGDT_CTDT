const luuTru = require('../services/luuTru.service');

// GET /api/storage?prefix=stream/2101420/1  (x-teacher-key) -> nội dung 1 cấp thư mục
exports.lietKe = async (req, res, next) => {
  try {
    res.json(await luuTru.lietKe(req.query.prefix));
  } catch (err) {
    next(err);
  }
};

// GET /api/storage/summary?prefix=  (x-teacher-key) -> tổng số file + dung lượng
exports.tongKet = async (req, res, next) => {
  try {
    res.json(await luuTru.tongKet(req.query.prefix));
  } catch (err) {
    next(err);
  }
};
