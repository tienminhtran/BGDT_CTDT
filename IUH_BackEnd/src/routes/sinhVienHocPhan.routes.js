const express = require('express');
const controller = require('../controllers/sinhVienHocPhan.controller');
const teacherKey = require('../middlewares/teacherKey');

const router = express.Router();

// POST /api/student-courses/import  (Bearer wstoken)
router.post('/import', controller.importFromLms);

// GET /api/student-courses/access?course=<token>  (Bearer wstoken)
// Kiểm tra SV có quyền học khóa (token mờ) không. Đặt trước /:studentId.
router.get('/access', controller.kiemTraMon);

// Màn quản lý của giảng viên: danh sách SV + thao tác trên 1 SV.
// Đều yêu cầu header x-teacher-key (thay cho đăng nhập).
router.get('/', teacherKey, controller.listSinhVien);
router.delete('/:studentId', teacherKey, controller.xoaSinhVien);
router.post('/:studentId/unlock', teacherKey, controller.moKhoaSinhVien);

// GET /api/student-courses/:studentId
router.get('/:studentId', controller.listByMssv);

module.exports = router;
