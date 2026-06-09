const moodle = require('../services/moodle.service');
const svhp = require('../services/sinhVienHocPhan.service');

// GET /api/sinhvien-hocphan/:mssv -> danh sách học phần (idnumber) của SV
exports.listByMssv = async (req, res, next) => {
  try {
    const { mssv } = req.params;
    const hocPhan = await svhp.getHocPhanByMssv(mssv);
    res.json({ mssv, hocPhan });
  } catch (err) {
    next(err);
  }
};

// GET /api/sinhvien-hocphan/kiem-tra/:maMon  (Bearer wstoken)
// Kiểm tra SV (lấy MSSV từ wstoken) có quyền học môn :maMon không.
exports.kiemTraMon = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!wstoken) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    const { maMon } = req.params;
    const info = await moodle.getSiteInfo(wstoken);
    const result = await svhp.kiemTraSinhVienHocMon(info.username, maMon);

    res.json({ mssv: info.username, maMon, ...result });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};

// POST /api/sinhvien-hocphan/import  (Bearer wstoken)
// Tự lấy danh sách môn từ LMS rồi import idnumber nào SV chưa có.
exports.importFromLms = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!wstoken) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    // Lấy MSSV (username) + userid từ chính wstoken
    const info = await moodle.getSiteInfo(wstoken);
    const courses = await moodle.getUserCourses(wstoken, info.userid);
    const idnumbers = courses.map((c) => c.idnumber).filter(Boolean);

    const result = await svhp.importHocPhan(info.username, idnumbers);
    res.json({ mssv: info.username, ...result });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};
