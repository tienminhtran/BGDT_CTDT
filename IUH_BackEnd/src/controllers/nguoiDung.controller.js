const nguoiDung = require('../services/nguoiDung.service');

// POST /api/users/login  body: { manhansu, matkhau }
exports.dangNhap = async (req, res, next) => {
  try {
    const { manhansu, matkhau } = req.body || {};
    res.json(await nguoiDung.dangNhap(manhansu, matkhau));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// GET /api/users/me  (Bearer token) -> thông tin phiên hiện tại
// FE gọi khi mở lại tab để biết token còn hạn không mà không cần bắt lỗi 401 ở nơi khác.
exports.thongTinPhien = (req, res) => {
  res.json({ Manhansu: req.user.ma, hoten: req.user.hoten });
};

// GET /api/users  (Bearer token)
exports.danhSach = async (req, res, next) => {
  try {
    res.json({ items: await nguoiDung.danhSach() });
  } catch (err) {
    next(err);
  }
};

// POST /api/users  (Bearer token)  body: { manhansu, hoten, matkhau, trangthai? }
exports.tao = async (req, res, next) => {
  try {
    res.status(201).json(await nguoiDung.tao(req.body || {}));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// DELETE /api/users/:manhansu  (Bearer token)
exports.xoa = async (req, res, next) => {
  try {
    // req.user.ma do middleware auth giải từ token -> người dùng không tự khai được.
    res.json(await nguoiDung.xoa(req.params.manhansu, req.user.ma));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// PATCH /api/users/:manhansu/mat-khau  (Bearer token)  body: { matkhau }
// Quản trị viên cấp lại mật khẩu, không cần biết mật khẩu cũ.
exports.datLaiMatKhau = async (req, res, next) => {
  try {
    const { matkhau } = req.body || {};
    res.json(await nguoiDung.datLaiMatKhau(req.params.manhansu, matkhau));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};

// PATCH /api/users/:manhansu/trang-thai  (Bearer token)  body: { trangthai }
exports.doiTrangThai = async (req, res, next) => {
  try {
    const { trangthai } = req.body || {};
    res.json(await nguoiDung.doiTrangThai(req.params.manhansu, trangthai, req.user.ma));
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
};
