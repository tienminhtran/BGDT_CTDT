const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Kho file tạm "bền" giữa API upload và worker cắt chunk.
 *
 * Multer lưu file theo request rồi controller xóa ngay khi trả response, nên worker
 * chạy sau vài phút sẽ không còn input. Ở đây API chuyển file gốc sang thư mục spool,
 * worker dùng xong thì xóa. Spool chỉ là tối ưu: mất file (server restart, dọn ổ đĩa,
 * worker chạy ở container khác) thì worker tự tải lại video gốc từ MinIO.
 *
 * Đặt tên theo id bài giảng nên mỗi bài chỉ giữ tối đa 1 file - upload lại sẽ ghi đè.
 */

const SPOOL_DIR =
  (process.env.VIDEO_SPOOL_DIR && process.env.VIDEO_SPOOL_DIR.trim()) ||
  path.join(os.tmpdir(), 'iuh_video_spool');

const TIEN_TO = 'baigiang_';

function ensureSpoolDir() {
  fs.mkdirSync(SPOOL_DIR, { recursive: true });
  return SPOOL_DIR;
}

// Tên file phải suy ra được id để dọn rác, nên chỉ nhận id số nguyên.
function tenFile(idBaiGiang, ext) {
  const duoi = String(ext || '.mp4').toLowerCase();
  return `${TIEN_TO}${parseInt(idBaiGiang, 10)}${duoi.startsWith('.') ? duoi : `.${duoi}`}`;
}

/**
 * Mọi file trong spool thuộc về 1 bài giảng.
 * Bình thường chỉ có 1, nhưng upload lại bằng định dạng khác (mp4 -> mkv) sinh ra
 * tên khác nên phải quét theo tiền tố chứ không đoán theo đuôi file.
 * @returns {string[]} danh sách đường dẫn
 */
function timTatCaFileSpool(idBaiGiang) {
  const id = parseInt(idBaiGiang, 10);
  if (!Number.isInteger(id)) return [];

  let names;
  try {
    names = fs.readdirSync(SPOOL_DIR);
  } catch (_) {
    return []; // chưa có thư mục spool -> coi như không có file
  }

  // Khớp đúng "baigiang_<id>." để id 1 không nhặt nhầm file của id 12.
  const tienTo = `${TIEN_TO}${id}.`;
  return names.filter((n) => n.startsWith(tienTo)).map((n) => path.join(SPOOL_DIR, n));
}

/**
 * Chuyển file tạm của multer vào spool. Ưu tiên rename (tức thì, không tốn I/O);
 * rename chỉ chạy được trong cùng filesystem nên khi khác ổ đĩa/mount thì copy rồi xóa.
 * @returns {string} đường dẫn file trong spool
 */
function luuVaoSpool(idBaiGiang, duongDanTam, ext) {
  ensureSpoolDir();

  // Upload lại cho cùng bài giảng: xóa MỌI file cũ của id này, không chỉ file trùng
  // tên. Sót lại bản cũ đuôi khác thì worker có thể bốc nhầm và cắt lại video cũ.
  xoaFileSpool(idBaiGiang);

  const dich = path.join(SPOOL_DIR, tenFile(idBaiGiang, ext));
  try {
    fs.renameSync(duongDanTam, dich);
  } catch (e) {
    if (e.code !== 'EXDEV') throw e;
    fs.copyFileSync(duongDanTam, dich);
    fs.rmSync(duongDanTam, { force: true });
  }
  return dich;
}

/**
 * Tìm file gốc trong spool của 1 bài giảng (không biết trước phần mở rộng).
 * @returns {string|null} đường dẫn, hoặc null nếu không còn
 */
function timFileSpool(idBaiGiang) {
  const ds = timTatCaFileSpool(idBaiGiang);
  if (!ds.length) return null;
  if (ds.length === 1) return ds[0];

  // Không nên xảy ra (luuVaoSpool đã dọn), nhưng nếu có thì lấy file mới nhất -
  // đoán mò theo thứ tự readdir dễ trả về đúng bản cũ.
  return ds
    .map((p) => ({ p, mtime: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0].p;
}

function xoaFileSpool(idBaiGiang) {
  for (const p of timTatCaFileSpool(idBaiGiang)) fs.rmSync(p, { force: true });
}

module.exports = {
  SPOOL_DIR,
  ensureSpoolDir,
  luuVaoSpool,
  timFileSpool,
  timTatCaFileSpool,
  xoaFileSpool,
};
