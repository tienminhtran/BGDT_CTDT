const moodle = require('../services/moodle.service');
const svhp = require('../services/sinhVienHocPhan.service');
const { decodeCourse } = require('../utils/courseToken');

// GET /api/student-courses/:studentId -> danh sách học phần (idnumber) của SV
exports.listByMssv = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const hocPhan = await svhp.getHocPhanByMssv(studentId);
    res.json({ studentId, hocPhan });
  } catch (err) {
    next(err);
  }
};

// GET /api/student-courses/access?course=<token>  (Bearer wstoken)
// Kiểm tra SV (lấy MSSV từ wstoken) có quyền học khóa (token mờ) không.
// KHÔNG trả mã môn ra client, chỉ trả cờ allowed.
exports.kiemTraMon = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!wstoken) {
      return res.status(401).json({ message: 'Bạn vui lòng đăng nhập' });
    }

    const { course } = req.query;
    if (!course) return res.status(400).json({ message: 'Thiếu mã khóa học' });

    const { maMon } = decodeCourse(course); // ném 400 nếu token sai
    const info = await moodle.getSiteInfo(wstoken);
    const { allowed } = await svhp.kiemTraSinhVienHocMon(info.username, maMon);

    res.json({ allowed });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
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
      return res.status(401).json({ message: 'Bạn vui lòng đăng nhập' });
    }

    // Lấy MSSV (username) + userid từ chính wstoken
    const info = await moodle.getSiteInfo(wstoken);
    const courses = await moodle.getUserCourses(wstoken, info.userid);
    const idnumbers = courses.map((c) => c.idnumber).filter(Boolean);

    const result = await svhp.importHocPhan(info.username, idnumbers);
    res.json({ mssv: info.username, ...result });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: 'Bạn vui lòng đăng nhập' });
    }
    next(err);
  }
};
