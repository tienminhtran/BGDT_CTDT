const express = require('express');
const controller = require('../controllers/lichSuThayDoiBaiGiang.controller');
const teacherKey = require('../middlewares/teacherKey');

const router = express.Router();

// Nhật ký thao tác bài giảng — chỉ app giảng viên (x-teacher-key), SV không đụng tới.

// GET /api/lecture-history?limit=  -> toàn bộ nhật ký (kèm tên bài giảng + môn/phiên bản)
router.get('/', teacherKey, controller.tatCa);

// GET /api/lecture-history/:id  -> nhật ký của 1 bài giảng (mới nhất trước)
router.get('/:id', teacherKey, controller.danhSach);

// POST /api/lecture-history/:id  body: { hanhDong: 'tao'|'sua'|'xoa', maNguoi, lyDo? }
router.post('/:id', teacherKey, controller.ghi);

module.exports = router;
