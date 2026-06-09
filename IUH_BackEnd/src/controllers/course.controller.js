const moodle = require('../services/moodle.service');
const svhp = require('../services/sinhVienHocPhan.service');

function mapCourse(c) {
  return {
    id: c.id,
    shortname: c.shortname,
    fullname: c.fullname,
    displayname: c.displayname,
    idnumber: c.idnumber,
    category: c.category,
    summary: c.summary,
    progress: c.progress ?? null,
    completed: c.completed ?? null,
    visible: c.visible,
    hidden: c.hidden,
    startdate: c.startdate,
    enddate: c.enddate,
    lastaccess: c.lastaccess,
  };
}

// GET /api/courses -> danh sách môn học của SV (dựa trên wstoken trong header)
exports.list = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const wstoken = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!wstoken) {
      return res.status(401).json({ message: 'Chưa đăng nhập' });
    }

    // Lấy userid từ chính wstoken (đồng thời xác thực token còn sống)
    const info = await moodle.getSiteInfo(wstoken);
    const courses = await moodle.getUserCourses(wstoken, info.userid);

    // Gắn MaMon cho từng khóa học (idnumber = MaHocPhan -> tra tb_HocPhanMonHoc).
    // Nếu DB lỗi/chưa map thì vẫn trả về khóa học, chỉ thiếu maMon.
    let monMap = {};
    try {
      monMap = await svhp.getMonHocByHocPhan(courses.map((c) => c.idnumber));
    } catch (dbErr) {
      console.error('Không tra được MaMon từ DB:', dbErr.message);
    }

    const result = courses.map((c) => {
      const maHocPhan = svhp.catHaiSoCuoi(c.idnumber);
      const monHoc = monMap[maHocPhan] || [];
      return { ...mapCourse(c), maHocPhan, monHoc, maMon: monHoc[0] ?? null };
    });

    res.json({ courses: result });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};
