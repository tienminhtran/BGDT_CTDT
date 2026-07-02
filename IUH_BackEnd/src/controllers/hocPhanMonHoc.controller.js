const hpmh = require('../services/hocPhanMonHoc.service');

// POST /api/course-subjects/import  (Header: x-teacher-key = KEY_LOGIN_TEACHER)
// body: { rows: [{ MaMon, MaHocPhan }, ...] }
// Giảng viên import ánh xạ học phần <-> môn học (từ file Excel đã parse ở FE).
exports.importHocPhanMonHoc = async (req, res, next) => {
  try {
    const teacherKey = req.headers['x-teacher-key'];
    if (!process.env.KEY_LOGIN_TEACHER || teacherKey !== process.env.KEY_LOGIN_TEACHER) {
      return res.status(401).json({ message: 'Key giảng viên không hợp lệ' });
    }

    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || !rows.length) {
      return res.status(400).json({ message: 'Danh sách import trống' });
    }

    const result = await hpmh.importHocPhanMonHoc(rows);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
