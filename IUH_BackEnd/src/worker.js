require('dotenv').config();

const { getPool } = require('./config/db');
const { ensureBucket } = require('./config/minio');
const xuLyChunk = require('./services/xuLyChunk.service');

/**
 * Tiến trình worker cắt chunk chạy RIÊNG, không mở cổng HTTP.
 *
 * Dùng khi muốn tách hẳn ffmpeg khỏi máy chủ API (scale độc lập):
 *   - container API    : CHUNK_WORKER_ENABLED=false  + npm start
 *   - container worker : npm run worker
 * Chạy nhiều worker cùng lúc là an toàn - claimJobs() bốc job nguyên tử nên
 * không có chuyện hai worker cắt trùng một video.
 *
 * Mặc định (một container duy nhất) thì không cần file này: server.js đã tự bật
 * worker trong cùng tiến trình.
 */
async function start() {
  try {
    await getPool();
    await ensureBucket().catch((e) =>
      console.warn('Không cấu hình được bucket MinIO:', e.message)
    );

    // File này chạy riêng thì luôn bật worker, kể cả khi env tắt cờ cho container API.
    process.env.CHUNK_WORKER_ENABLED = 'true';
    xuLyChunk.startWorkerLoop();
    console.log('Worker cắt chunk đang chạy (Ctrl+C để dừng)');

    // startWorkerLoop() unref timer để không giữ tiến trình sống; ở đây không có
    // server HTTP nên cần một handle chủ động giữ event loop.
    setInterval(() => {}, 1 << 30);
  } catch (err) {
    console.error('Không thể khởi động worker:', err.message);
    process.exit(1);
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    // Không chờ job đang chạy: job dở dang được quetJobTreo() nhặt lại sau khi
    // worker khởi động lại.
    xuLyChunk.stopWorkerLoop();
    process.exit(0);
  });
}

start();
