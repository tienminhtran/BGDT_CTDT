const moodle = require('../services/moodle.service');
const svhp = require('../services/sinhVienHocPhan.service');
const { encodeCourse } = require('../utils/courseToken');

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
      // Bỏ idnumber null/rỗng; chỉ tra DB khi còn ít nhất 1 mã học phần.
      const idnumbers = courses.map((c) => c.idnumber).filter(Boolean);
      if (idnumbers.length) {
        monMap = await svhp.getMonHocByHocPhan(idnumbers);
      }
    } catch (dbErr) {
      console.error('Không tra được MaMon từ DB:', dbErr.message);
    }

    // Bỏ khóa không có idnumber (không map được học phần) -> không trả ra client.
    const result = courses
      .filter((c) => c.idnumber)
      .map((c) => {
      const maHocPhan = svhp.catHaiSoCuoi(c.idnumber);
      const monHoc = monMap[maHocPhan] || [];
      const maMon = monHoc[0] ?? null;
      // Token mờ để vào thẳng danh sách video (nút "Xem bài giảng"). Không lộ mã môn.
      // version=null -> lấy toàn bộ video của môn (không lọc theo phiên bản).
      const token = maMon ? encodeCourse({ maMon, version: null }) : null;
      return { ...mapCourse(c), maHocPhan, monHoc, maMon, token };
    });

    res.json({ courses: result });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};
