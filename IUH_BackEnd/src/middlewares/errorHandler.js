// Middleware xử lý lỗi tập trung
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Lỗi máy chủ nội bộ',
  });
};
