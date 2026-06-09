require('dotenv').config();

const app = require('./app');
const { getPool } = require('./config/db');
const { ensureBucket } = require('./config/minio');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Kết nối DB trước khi mở cổng
    await getPool();

    // Đảm bảo bucket MinIO tồn tại & ở chế độ private (không chặn nếu MinIO chưa chạy)
    await ensureBucket().catch((e) =>
      console.warn('⚠️  Không cấu hình được bucket MinIO:', e.message)
    );

    app.listen(PORT, () => {
      console.log(`2.Server đang chạy tại http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Không thể khởi động server:', err.message);
    process.exit(1);
  }
}

start();
