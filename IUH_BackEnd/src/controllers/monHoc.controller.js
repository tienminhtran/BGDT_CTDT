const monHoc = require('../services/monHoc.service');

// GET /api/monhoc -> danh sách môn học + phiên bản
exports.list = async (req, res, next) => {
  try {
    const data = await monHoc.listMonHoc();
    res.json({ monHoc: data });
  } catch (err) {
    next(err);
  }
};
