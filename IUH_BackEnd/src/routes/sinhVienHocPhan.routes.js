const express = require('express');
const controller = require('../controllers/sinhVienHocPhan.controller');

const router = express.Router();

// POST /api/student-courses/import  (Bearer wstoken)
router.post('/import', controller.importFromLms);

// GET /api/student-courses/access?course=<token>  (Bearer wstoken)
// Kiểm tra SV có quyền học khóa (token mờ) không. Đặt trước /:studentId.
router.get('/access', controller.kiemTraMon);

// GET /api/student-courses/:studentId
router.get('/:studentId', controller.listByMssv);

module.exports = router;
