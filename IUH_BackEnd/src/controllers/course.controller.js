const moodle = require('../services/moodle.service');
const svhp = require('../services/sinhVienHocPhan.service');
const { encodeCourse } = require('../utils/courseToken');

// Chỉ trả vài field FE cần: id (link LMS), tên môn, mã học phần, tiến độ.
function mapCourse(c) {
  return {
    id: c.id,
    fullname: c.fullname,
    idnumber: c.idnumber,
    progress: c.progress ?? null,
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
      // KHÔNG trả maHocPhan/maMon/monHoc ra client (lộ map nội bộ). Chỉ trả token mờ.
      return { ...mapCourse(c), token };
    });

    res.json({ courses: result });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};
