const express = require('express');
const controller = require('../controllers/baiGiang.controller');

const router = express.Router();

// GET /api/baigiang/danh-sach?maMon=&version=  -> danh sách video để xem (CoursePlayer)
router.get('/danh-sach', controller.listVideos);

// GET /api/baigiang/:id/playback-token  -> token xem HLS (cần đăng nhập LMS)
router.get('/:id/playback-token', controller.playbackToken);

// GET /api/baigiang/:id/hls/:file?token=  -> stream HLS qua backend (bucket private)
router.get('/:id/hls/:file', controller.streamHls);

// GET /api/baigiang/chi-tiet?monHocVersionId=<id>  -> danh sách chương + bài giảng
router.get('/chi-tiet', controller.listChiTiet);

// POST /api/baigiang/chi-tiet/:chiTietId/ensure  -> lấy/tạo baiGiangId cho 1 chương
router.post('/chi-tiet/:chiTietId/ensure', controller.ensureBaiGiang);

// POST /api/baigiang/:id/upload-video
// form-data: video=<file>  -> upload lên MinIO theo [ma_tuquan]/[version]/[Id]/{stream,chunk}
router.post('/:id/upload-video', controller.uploadMiddleware, controller.uploadVideo);

module.exports = router;
