const moodle = require('../services/moodle.service');
const svhp = require('../services/sinhVienHocPhan.service');
const baiGiang = require('../services/baiGiang.service');
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
      return res.status(401).json({ message: 'Tài khoản chưa đăng nhập' });
    }

    // Lấy userid từ chính wstoken (đồng thời xác thực token còn sống)
    const info = await moodle.getSiteInfo(wstoken);
    const courses = await moodle.getUserCourses(wstoken, info.userid);

    // Gắn MaMon cho từng khóa học (idnumber = MaHocPhan -> tra tb_HocPhanMonHoc).
    // Nếu DB lỗi/chưa map thì vẫn trả về khóa học, chỉ thiếu maMon.
    let monMap = {};
    let coVideoSet = new Set(); // các mã môn thật sự có video (để bật nút "Xem bài giảng")
    try {
      // Bỏ idnumber null/rỗng; chỉ tra DB khi còn ít nhất 1 mã học phần.
      const idnumbers = courses.map((c) => c.idnumber).filter(Boolean);
      if (idnumbers.length) {
        monMap = await svhp.getMonHocByHocPhan(idnumbers);
        // Trong các mã môn map được, lọc ra mã môn CÓ video (LinkBaiGiang != null).
        coVideoSet = await baiGiang.getMaMonCoVideo(Object.values(monMap).flat());
      }
    } catch (dbErr) {
      console.error('Không tra được Mã môn học và tình trạng video từ hệ thống:', dbErr.message);
    }

    // Bỏ khóa không có idnumber (không map được học phần) -> không trả ra client.
    const result = courses
      .filter((c) => c.idnumber)
      .map((c) => {
      const maHocPhan = svhp.catHaiSoCuoi(c.idnumber);
      const monHoc = monMap[maHocPhan] || [];
      const maMon = monHoc[0] ?? null;
      // Chỉ cấp token khi môn CÓ video thật sự -> nút "Xem bài giảng" mới bật.
      // version=null -> player tự lấy phiên bản mới nhất có video. Token mờ, không lộ mã môn.
      const token =
        maMon && coVideoSet.has(maMon) ? encodeCourse({ maMon, version: null }) : null;
      // KHÔNG trả maHocPhan/maMon/monHoc ra client (lộ map nội bộ). Chỉ trả token mờ.
      return { ...mapCourse(c), token };
    });

    // Sắp xếp: môn có token (xem được bài giảng) lên trước, sau đó theo tên (fullname) A→Z.
    result.sort((a, b) => {
      if (Boolean(a.token) !== Boolean(b.token)) return a.token ? -1 : 1;
      return (a.fullname || '').localeCompare(b.fullname || '', 'vi');
    });

    res.json({ courses: result });
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    next(err);
  }
};
