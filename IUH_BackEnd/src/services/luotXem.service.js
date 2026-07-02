const { sequelize } = require('../models/orm');

/**
 * Đếm lượt xem bài giảng theo kiểu "buffer + cron", tránh đụng DB mỗi lượt:
 *   - Client xem >= 3s mới gửi 1 beacon -> ghiNhanLuotXem().
 *   - Dedupe trong RAM (cùng người + bài giảng trong cửa sổ TTL chỉ tính 1 lần).
 *   - Cộng dồn vào buffer RAM (baiGiangId -> số lượt), KHÔNG ghi DB.
 *   - Cron (startFlushLoop) mỗi vài phút gộp buffer -> 1 câu UPDATE duy nhất.
 * Buffer/dedupe nằm trong RAM nên reset khi restart (chấp nhận được với lượt xem);
 * khi tắt server có flush() để không mất phần đang chờ.
 */

// baiGiangId -> số lượt xem đang chờ ghi vào DB.
let buffer = new Map();

// Dedupe: key "baiGiangId:viewer" -> thời điểm hết hạn (ms epoch).
const seen = new Map();

const DEDUPE_TTL_MS = (parseInt(process.env.VIEW_DEDUPE_MINUTES, 10) || 360) * 60 * 1000; // mặc định 6h
const FLUSH_INTERVAL_MS = (parseInt(process.env.VIEW_FLUSH_SECONDS, 10) || 150) * 1000; // mặc định 2.5 phút

let flushTimer = null;

// Ghi nhận 1 lượt xem. Trả về true nếu được tính (không trùng trong cửa sổ dedupe).
function ghiNhanLuotXem(baiGiangId, viewer) {
  const id = parseInt(baiGiangId, 10);
  if (!Number.isInteger(id) || id <= 0) return false;

  const now = Date.now();
  const key = `${id}:${viewer || 'anon'}`;
  const exp = seen.get(key);
  if (exp && exp > now) return false; // còn trong cửa sổ dedupe -> bỏ qua
  seen.set(key, now + DEDUPE_TTL_MS);

  buffer.set(id, (buffer.get(id) || 0) + 1);
  return true;
}

// Xóa các key dedupe đã hết hạn để Map không phình vô hạn.
function donDedupe() {
  const now = Date.now();
  for (const [k, exp] of seen) if (exp <= now) seen.delete(k);
}

// Gộp toàn bộ buffer -> 1 câu UPDATE (CASE) vào SQL Server.
// Đổi sang buffer mới TRƯỚC để không mất lượt phát sinh trong lúc đang ghi DB.
async function flush() {
  donDedupe();
  if (!buffer.size) return;

  const pending = buffer;
  buffer = new Map();

  const entries = [...pending.entries()].filter(([, c]) => c > 0);
  if (!entries.length) return;

  try {
    // id và count đều là số nguyên (đã parseInt/đếm nội bộ) -> nội suy an toàn.
    const ids = entries.map(([id]) => id).join(',');
    const cases = entries.map(([id, c]) => `WHEN ${id} THEN ${c}`).join(' ');
    await sequelize.query(
      `UPDATE tb_BaiGiang
       SET LuotXem = ISNULL(LuotXem, 0) + CASE Id ${cases} ELSE 0 END
       WHERE Id IN (${ids})`
    );
  } catch (err) {
    // Ghi lỗi -> trả lượt chưa ghi về buffer để lần flush sau thử lại.
    for (const [id, c] of pending) buffer.set(id, (buffer.get(id) || 0) + c);
    console.error('Flush lượt xem lỗi, sẽ thử lại lần sau:', err.message);
  }
}

// Bật vòng lặp flush định kỳ (gọi 1 lần khi server sẵn sàng).
function startFlushLoop() {
  if (flushTimer) return;
  flushTimer = setInterval(() => flush().catch(() => {}), FLUSH_INTERVAL_MS);
  if (flushTimer.unref) flushTimer.unref(); // không giữ tiến trình sống chỉ vì timer
}

function stopFlushLoop() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

module.exports = { ghiNhanLuotXem, flush, startFlushLoop, stopFlushLoop };
