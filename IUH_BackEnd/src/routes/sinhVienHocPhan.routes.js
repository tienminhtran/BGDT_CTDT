const express = require('express');
const controller = require('../controllers/sinhVienHocPhan.controller');

const router = express.Router();

// POST /api/sinhvien-hocphan/import  (Bearer wstoken)
router.post('/import', controller.importFromLms);

// GET /api/sinhvien-hocphan/kiem-tra/:maMon  (Bearer wstoken)
// Đặt trước /:mssv để không bị nuốt route (đây là 2 segment nên thực tế không đụng,
// nhưng để rõ ý ưu tiên).
router.get('/kiem-tra/:maMon', controller.kiemTraMon);

// GET /api/sinhvien-hocphan/:mssv
router.get('/:mssv', controller.listByMssv);

module.exports = router;
