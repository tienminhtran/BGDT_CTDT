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

// Ánh xạ học phần <-> môn học (import từ Excel)
const hocPhanMonHocRoutes = require('./hocPhanMonHoc.routes');
router.use('/course-subjects', hocPhanMonHocRoutes);

// Bài giảng (upload video lên MinIO)
const baiGiangRoutes = require('./baiGiang.routes');
router.use('/lectures', baiGiangRoutes);

// Đánh giá / bình luận bài giảng (SV chấm sao + bình luận)
const danhGiaRoutes = require('./danhGiaBaiGiang.routes');
router.use('/reviews', danhGiaRoutes);

// Thư mục video bài giảng trên MinIO (chỉ đọc)
const luuTruRoutes = require('./luuTru.routes');
router.use('/storage', luuTruRoutes);

const exampleRoutes = require('./example.routes');
router.use('/examples', exampleRoutes);

module.exports = router;
