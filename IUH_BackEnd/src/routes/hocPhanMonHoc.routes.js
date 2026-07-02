const express = require('express');
const controller = require('../controllers/hocPhanMonHoc.controller');

const router = express.Router();

// POST /api/course-subjects/import  (Header: x-teacher-key)
// Import ánh xạ học phần <-> môn học vào tb_HocPhanMonHoc.
router.post('/import', controller.importHocPhanMonHoc);

module.exports = router;
