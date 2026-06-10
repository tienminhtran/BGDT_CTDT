const express = require('express');
const controller = require('../controllers/baiGiang.controller');
const apiKey = require('../middlewares/apiKey');

const router = express.Router();

// GET /api/lectures?course=<token>  -> danh sách video để xem (CoursePlayer)
router.get('/', controller.listVideos);

// POST /api/lectures/token  body: { courseCode, version }  -> token mờ cho khóa học
router.post('/token', controller.createCourseToken);

// GET /api/lectures/chapters?subjectVersionId=<id>  -> danh sách chương + bài giảng
router.get('/chapters', controller.listChiTiet);

// POST /api/lectures/chapters/:chapterId/ensure  -> lấy/tạo lectureId cho 1 chương
router.post('/chapters/:chapterId/ensure', controller.ensureBaiGiang);

// GET /api/lectures/:id/playback-token  -> token xem HLS (cần đăng nhập LMS)
router.get('/:id/playback-token', controller.playbackToken);

// GET /api/lectures/:id/hls/:file?token=  -> stream HLS qua backend (bucket private)
router.get('/:id/hls/:file', controller.streamHls);

// POST /api/lectures/:id/video
// Header: x-api-key=<UPLOAD_API_KEY>  (bảo vệ endpoint upload)
// form-data: video=<file>  -> upload lên MinIO theo [ma_tuquan]/[version]/[Id]/{stream,chunk}
router.post('/:id/video', apiKey, controller.uploadMiddleware, controller.uploadVideo);

module.exports = router;
