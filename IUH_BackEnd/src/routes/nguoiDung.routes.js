const express = require('express');

const controller = require('../controllers/nguoiDung.controller');
const auth = require('../middlewares/auth');

const router = express.Router();

/**
 * Tài khoản đăng nhập app giảng viên (bảng tb_login_bgdt).
 *
 * Mọi route quản lý tài khoản đều đòi JWT do POST /login cấp, KHÔNG dùng
 * x-teacher-key: key đó là một chuỗi tĩnh dùng chung, ai có nó cũng tạo/xóa được
 * tài khoản của người khác và không truy được ai đã thao tác.
 */

// POST /api/users/login  body: { manhansu, matkhau } -> { token, nguoiDung }
router.post('/login', controller.dangNhap);

// Từ đây trở xuống bắt buộc có Bearer token.
router.use(auth);

// GET /api/users/me -> thông tin phiên hiện tại (dùng để kiểm token còn hạn)
router.get('/me', controller.thongTinPhien);

// GET /api/users -> danh sách tài khoản
router.get('/', controller.danhSach);

// POST /api/users  body: { manhansu, hoten, matkhau, trangthai? }
router.post('/', controller.tao);

// DELETE /api/users/:manhansu
router.delete('/:manhansu', controller.xoa);

// PATCH /api/users/:manhansu/trang-thai  body: { trangthai: 'HoatDong' | 'Khoa' }
router.patch('/:manhansu/trang-thai', controller.doiTrangThai);

// PATCH /api/users/:manhansu/mat-khau  body: { matkhau } -> cấp lại mật khẩu
router.patch('/:manhansu/mat-khau', controller.datLaiMatKhau);

module.exports = router;
