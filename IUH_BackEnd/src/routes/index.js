const express = require('express');

const router = express.Router();

// Auth (đăng nhập LMS Moodle)
const authRoutes = require('./auth.routes');
router.use('/auth', authRoutes);

// Khoá học LMS của SV
const courseRoutes = require('./course.routes');
router.use('/courses', courseRoutes);

// Sinh viên - Học phần (lưu/lấy idnumber theo MSSV)
const svhpRoutes = require('./sinhVienHocPhan.routes');
router.use('/student-courses', svhpRoutes);

// Môn học + phiên bản (quản lý bài giảng)
const monHocRoutes = require('./monHoc.routes');
router.use('/subjects', monHocRoutes);

// Bài giảng (upload video lên MinIO)
const baiGiangRoutes = require('./baiGiang.routes');
router.use('/lectures', baiGiangRoutes);

// Đánh giá / bình luận bài giảng (SV chấm sao + bình luận)
const danhGiaRoutes = require('./danhGiaBaiGiang.routes');
router.use('/reviews', danhGiaRoutes);

const exampleRoutes = require('./example.routes');
router.use('/examples', exampleRoutes);

module.exports = router;
