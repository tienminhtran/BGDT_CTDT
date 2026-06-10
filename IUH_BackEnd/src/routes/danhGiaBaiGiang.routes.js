const express = require('express');
const controller = require('../controllers/danhGiaBaiGiang.controller');

const router = express.Router();

// GET /api/danhgia/:baiGiangId?page=&pageSize=  -> danh sách bình luận + sao + thống kê
router.get('/:baiGiangId', controller.danhSach);

// GET /api/danhgia/:baiGiangId/sinh-vien  (Bearer wstoken) -> đánh giá của chính SV đang đăng nhập
router.get('/:baiGiangId/sinh-vien', controller.cuaToi);

// POST /api/danhgia/:baiGiangId  (Bearer wstoken)  body: { soSao, binhLuan }
router.post('/:baiGiangId', controller.tao);

// PUT /api/danhgia/:baiGiangId  (Bearer wstoken)  body: { soSao?, binhLuan? }
router.put('/:baiGiangId', controller.sua);

module.exports = router;
