// Middleware kiểm tra key giảng viên cho các thao tác quản trị (app giảng viên
// không có đăng nhập LMS). Client gửi ở header: x-teacher-key: <KEY_LOGIN_TEACHER>
module.exports = (req, res, next) => {
  const KEY = process.env.KEY_LOGIN_TEACHER;

  // Chưa cấu hình key trên server -> chặn luôn để tránh mở toang endpoint.
  if (!KEY) {
    return res.status(500).json({ message: 'Chưa cấu hình KEY_LOGIN_TEACHER trên server' });
  }

  if (req.headers['x-teacher-key'] !== KEY) {
    return res.status(401).json({ message: 'Key giảng viên không hợp lệ' });
  }

  next();
};
