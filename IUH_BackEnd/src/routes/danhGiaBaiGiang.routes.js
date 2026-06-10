const express = require('express');
const controller = require('../controllers/danhGiaBaiGiang.controller');

const router = express.Router();

// GET /api/reviews/:lectureId  -> thống kê đánh giá tổng hợp (không trả đánh giá từng SV)
router.get('/:lectureId', controller.danhSach);

// GET /api/reviews/:lectureId/mine  (Bearer wstoken) -> đánh giá của chính SV đang đăng nhập
router.get('/:lectureId/mine', controller.cuaToi);

// POST /api/reviews/:lectureId  (Bearer wstoken)  body: { stars, comment }
router.post('/:lectureId', controller.tao);

// PUT /api/reviews/:lectureId  (Bearer wstoken)  body: { stars?, comment? }
router.put('/:lectureId', controller.sua);

module.exports = router;
