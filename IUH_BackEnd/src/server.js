require('dotenv').config();

const app = require('./app');
const { getPool } = require('./config/db');
const { ensureBucket } = require('./config/minio');
const luotXem = require('./services/luotXem.service');
const loginGuard = require('./services/loginGuard.service');

const result = require('dotenv').config();
// console.log('dotenv result:', result);
// console.log('DB_USER:', process.env.DB_USER);

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
      // Bật cron gộp lượt xem (buffer RAM -> UPDATE định kỳ).
      luotXem.startFlushLoop();

      // Dọn bộ đếm đăng nhập sai / khóa / captcha đã hết hạn (mỗi 10 phút).
      const donRac = () => loginGuard.donRacHetHan().catch(() => {});
      donRac();
      setInterval(donRac, 10 * 60 * 1000).unref();
    });
  } catch (err) {
    console.error('Không thể khởi động server:', err.message);
    process.exit(1);
  }
}

// Khi tắt server: ghi nốt lượt xem còn trong buffer rồi mới thoát.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    luotXem.stopFlushLoop();
    await luotXem.flush().catch(() => {});
    process.exit(0);
  });
}

start();
