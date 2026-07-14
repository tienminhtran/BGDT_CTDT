const express = require('express');
const controller = require('../controllers/hocPhanMonHoc.controller');
const teacherKey = require('../middlewares/teacherKey');

const router = express.Router();

// GET /api/course-subjects -> danh sách ánh xạ học phần <-> môn (kèm tên môn)
router.get('/', teacherKey, controller.listAnhXa);

// POST /api/course-subjects/import  (Header: x-teacher-key, controller tự kiểm tra)
// Import ánh xạ học phần <-> môn học vào tb_HocPhanMonHoc.
router.post('/import', controller.importHocPhanMonHoc);

// DELETE /api/course-subjects/:id -> xóa 1 dòng ánh xạ
router.delete('/:id', teacherKey, controller.xoaAnhXa);

module.exports = router;
