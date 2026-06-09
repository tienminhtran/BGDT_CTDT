const Minio = require('minio');

// Tách endpoint (vd http://localhost:9000) thành host/port/ssl cho SDK MinIO
const rawEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const useSSL =
  process.env.MINIO_USE_SSL === 'true' || rawEndpoint.startsWith('https://');

const withoutScheme = rawEndpoint.replace(/^https?:\/\//, '');
const [host, portStr] = withoutScheme.split(':');

const minioClient = new Minio.Client({
  endPoint: host,
  port: portStr ? parseInt(portStr, 10) : useSSL ? 443 : 80,
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'minioadmin',
  secretKey:
    process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin123',
});

const BUCKET = process.env.MINIO_BUCKET || 'baigiang';

// Đảm bảo bucket tồn tại (tạo nếu chưa có) và để PRIVATE.
// Video chỉ được phát qua backend (stream có token) -> không cho tải trực tiếp từ MinIO.
async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
  }
  // Gỡ mọi policy public (nếu có) -> bucket private. Bỏ qua nếu lỗi.
  try {
    await minioClient.setBucketPolicy(BUCKET, '');
  } catch (_) {
    /* không chặn luồng nếu không set được policy */
  }
}

// URL công khai để truy cập 1 object trong bucket.
function buildPublicUrl(objectName) {
  const base = rawEndpoint.replace(/\/+$/, '');
  return `${base}/${BUCKET}/${objectName}`;
}

// Chuyển giá trị lưu trong DB (object key tương đối) -> URL đầy đủ để phát.
// Nếu DB lỡ lưu sẵn URL tuyệt đối (dữ liệu cũ) thì trả về nguyên trạng.
function resolvePublicUrl(stored) {
  if (!stored) return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  return buildPublicUrl(String(stored).replace(/^\/+/, ''));
}

// Ngược lại resolvePublicUrl: lấy object key (tương đối) từ giá trị lưu trong DB,
// kể cả khi dữ liệu cũ lưu nguyên URL tuyệt đối.
function toObjectKey(stored) {
  if (!stored) return null;
  let s = String(stored).replace(/^https?:\/\/[^/]+\//i, ''); // bỏ scheme+host
  if (s.startsWith(`${BUCKET}/`)) s = s.slice(BUCKET.length + 1); // bỏ tên bucket
  return s.replace(/^\/+/, '');
}

module.exports = {
  minioClient,
  BUCKET,
  ensureBucket,
  buildPublicUrl,
  resolvePublicUrl,
  toObjectKey,
};
