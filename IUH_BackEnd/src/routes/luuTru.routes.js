const express = require('express');
const controller = require('../controllers/luuTru.controller');
const teacherKey = require('../middlewares/teacherKey');

const router = express.Router();

// GET /api/storage/summary?prefix=  -> tổng số file + dung lượng (đặt trước '/')
router.get('/summary', teacherKey, controller.tongKet);

// GET /api/storage?prefix=stream/2101420/1 -> nội dung 1 cấp thư mục
router.get('/', teacherKey, controller.lietKe);

module.exports = router;
