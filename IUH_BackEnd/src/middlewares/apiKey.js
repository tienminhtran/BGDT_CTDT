// Middleware kiểm tra API key cho các thao tác nhạy cảm (vd upload video).
// Client gửi key ở header: x-api-key: <UPLOAD_API_KEY>
const API_KEY = process.env.UPLOAD_API_KEY;

module.exports = (req, res, next) => {
  // Chưa cấu hình key trên server -> chặn luôn để tránh mở toang endpoint.
  if (!API_KEY) {
    return res.status(500).json({ message: 'Chưa cấu hình UPLOAD_API_KEY trên server' });
  }

  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ message: 'API key không hợp lệ' });
  }

  next();
};
