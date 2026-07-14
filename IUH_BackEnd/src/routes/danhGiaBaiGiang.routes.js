const express = require('express');
const controller = require('../controllers/danhGiaBaiGiang.controller');
const teacherKey = require('../middlewares/teacherKey');

const router = express.Router();

// GET /api/reviews/my  (Bearer wstoken) -> tất cả đánh giá của SV đang đăng nhập.
// PHẢI đặt trước '/:lectureId' để 'my' không bị bắt nhầm thành lectureId.
router.get('/my', controller.cuaToiTatCa);

// GET /api/reviews/overview  (x-teacher-key) -> thống kê theo phiên bản môn (màn giảng viên).
// Cũng phải đặt trước '/:lectureId'.
router.get('/overview', teacherKey, controller.tongQuan);

// GET /api/reviews/overview/:versionId/comments  (x-teacher-key) -> bình luận của 1 phiên bản môn
router.get('/overview/:versionId/comments', teacherKey, controller.binhLuanTheoPhienBan);

// GET /api/reviews/:lectureId  -> thống kê đánh giá tổng hợp (không trả đánh giá từng SV)
router.get('/:lectureId', controller.danhSach);

// GET /api/reviews/:lectureId/mine  (Bearer wstoken) -> đánh giá của chính SV đang đăng nhập
router.get('/:lectureId/mine', controller.cuaToi);

// POST /api/reviews/:lectureId  (Bearer wstoken)  body: { stars, comment }
router.post('/:lectureId', controller.tao);

// PUT /api/reviews/:lectureId  (Bearer wstoken)  body: { stars?, comment? }
router.put('/:lectureId', controller.sua);

module.exports = router;
