const { minioClient, BUCKET, ensureBucket } = require('../config/minio');

/**
 * Duyệt thư mục video bài giảng trên MinIO (chỉ đọc).
 *
 * MinIO không có thư mục thật — chỉ có object key dạng
 *   [ma_tuquan]/[version]/[idChiTiet]/stream/video.mp4
 *   [ma_tuquan]/[version]/[idChiTiet]/chunk/index.m3u8
 * "Thư mục" là phần key trước dấu '/'. SDK gọi các nhánh này là *common prefix*.
 *
 * Bucket đang có ~15k object (mỗi segment .ts là 1 object) nên KHÔNG dựng cả cây
 * một lần — liệt kê theo từng cấp, FE mở thư mục nào thì gọi tiếp thư mục đó.
 */

// Liệt kê 1 cấp trong bucket. prefix '' = thư mục gốc.
async function lietKe(prefix = '') {
  await ensureBucket();

  // Chuẩn hóa: bỏ '/' thừa ở đầu, đảm bảo có '/' ở cuối (trừ thư mục gốc).
  let p = String(prefix || '').replace(/^\/+/, '');
  if (p && !p.endsWith('/')) p += '/';

  const thuMuc = [];
  const file = [];

  // recursive = false -> MinIO trả về các "thư mục con" dưới dạng object.prefix
  const stream = minioClient.listObjectsV2(BUCKET, p, false);
  for await (const obj of stream) {
    if (obj.prefix) {
      const duongDan = obj.prefix.replace(/\/$/, '');
      thuMuc.push({
        ten: duongDan.slice(p.length),
        duongDan,
        loai: 'folder',
      });
      continue;
    }

    if (!obj.name) continue;
    file.push({
      ten: obj.name.slice(p.length),
      duongDan: obj.name,
      loai: 'file',
      kichThuoc: Number(obj.size) || 0,
      capNhat: obj.lastModified ?? null,
    });
  }

  const sapXep = (a, b) => a.ten.localeCompare(b.ten, 'vi', { numeric: true });
  thuMuc.sort(sapXep);
  file.sort(sapXep);

  return { prefix: p.replace(/\/$/, ''), thuMuc, file };
}

/**
 * Tổng số file + dung lượng của 1 nhánh (đệ quy). prefix '' = cả bucket.
 * Quét toàn bộ object dưới prefix nên chỉ gọi khi cần số tổng.
 */
async function tongKet(prefix = '') {
  await ensureBucket();

  let p = String(prefix || '').replace(/^\/+/, '');
  if (p && !p.endsWith('/')) p += '/';

  let soFile = 0;
  let kichThuoc = 0;

  const stream = minioClient.listObjectsV2(BUCKET, p, true); // true = đệ quy
  for await (const obj of stream) {
    if (!obj.name) continue;
    soFile += 1;
    kichThuoc += Number(obj.size) || 0;
  }

  return { bucket: BUCKET, prefix: p.replace(/\/$/, ''), soFile, kichThuoc };
}

module.exports = { lietKe, tongKet };
