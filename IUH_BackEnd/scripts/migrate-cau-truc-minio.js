/*
 * Chuyển cấu trúc lưu trữ video bài giảng trên MinIO + cập nhật link trong DB.
 *
 *   Cũ:  [ma_tuquan]/[version]/[idChiTiet]/stream/video.mp4
 *        [ma_tuquan]/[version]/[idChiTiet]/chunk/index.m3u8 + seg_*.ts
 *   Mới: stream/[ma_tuquan]/[version]/[idChiTiet]/video.mp4
 *        chunk/[ma_tuquan]/[version]/[idChiTiet]/index.m3u8 + seg_*.ts
 *
 * Cách chạy (trong thư mục IUH_BackEnd):
 *   node scripts/migrate-cau-truc-minio.js              # thử khan, KHÔNG ghi gì
 *   node scripts/migrate-cau-truc-minio.js --apply      # copy sang key mới + xóa key cũ + cập nhật DB
 *   node scripts/migrate-cau-truc-minio.js --apply --chi-minio   # chỉ di chuyển object
 *   node scripts/migrate-cau-truc-minio.js --apply --chi-db      # chỉ cập nhật DB
 *
 * An toàn: copy trước rồi mới xóa key cũ; chạy lại nhiều lần không sao vì key đã
 * đổi (bắt đầu bằng 'stream/'/'chunk/') sẽ bị bỏ qua.
 */
require('dotenv').config();

const { minioClient, BUCKET, ensureBucket } = require('../src/config/minio');
const { sequelize } = require('../src/models/orm');

const APPLY = process.argv.includes('--apply');
const CHI_MINIO = process.argv.includes('--chi-minio');
const CHI_DB = process.argv.includes('--chi-db');

const LAM_MINIO = !CHI_DB;
const LAM_DB = !CHI_MINIO;

// Key cũ: <ma>/<version>/<idChiTiet>/(stream|chunk)/<đuôi>  ->  (stream|chunk)/<ma>/<version>/<idChiTiet>/<đuôi>
const MAU_KEY_CU = /^([^/]+\/[^/]+\/[^/]+)\/(stream|chunk)\/(.+)$/;

function keyMoi(keyCu) {
  const m = MAU_KEY_CU.exec(keyCu);
  if (!m) return null; // không đúng cấu trúc cũ -> bỏ qua
  const [, duoi, loai, tenFile] = m;
  return `${loai}/${duoi}/${tenFile}`;
}

// Liệt kê toàn bộ object trong bucket (đệ quy).
async function tatCaObject() {
  const ds = [];
  const stream = minioClient.listObjectsV2(BUCKET, '', true);
  for await (const obj of stream) {
    if (obj.name) ds.push(obj.name);
  }
  return ds;
}

async function diChuyenObject() {
  await ensureBucket();

  console.log(`\n[MinIO] Đang quét bucket "${BUCKET}"...`);
  const tatCa = await tatCaObject();

  const canDoi = [];
  let daDung = 0;
  for (const key of tatCa) {
    if (key.startsWith('stream/') || key.startsWith('chunk/')) {
      daDung += 1; // đã theo cấu trúc mới
      continue;
    }
    const moi = keyMoi(key);
    if (moi) canDoi.push({ cu: key, moi });
  }

  const boQua = tatCa.length - daDung - canDoi.length;
  console.log(`[MinIO] Tổng ${tatCa.length} object: ${canDoi.length} cần đổi, ${daDung} đã đúng cấu trúc mới, ${boQua} không khớp mẫu (bỏ qua).`);

  if (!canDoi.length) return { doi: 0, loi: 0 };

  // Xem trước vài dòng đầu để đối chiếu bằng mắt
  for (const { cu, moi } of canDoi.slice(0, 5)) {
    console.log(`   ${cu}\n     -> ${moi}`);
  }
  if (canDoi.length > 5) console.log(`   ... và ${canDoi.length - 5} object nữa`);

  if (!APPLY) {
    console.log('[MinIO] Chế độ thử khan — chưa ghi gì. Thêm --apply để thực hiện.');
    return { doi: 0, loi: 0 };
  }

  let doi = 0;
  let loi = 0;
  for (const { cu, moi } of canDoi) {
    try {
      // Copy phía server (giữ nguyên Content-Type), sau đó mới xóa key cũ.
      await minioClient.copyObject(BUCKET, moi, `/${BUCKET}/${cu}`);
      await minioClient.removeObject(BUCKET, cu);
      doi += 1;
      if (doi % 200 === 0) console.log(`[MinIO] ...đã đổi ${doi}/${canDoi.length}`);
    } catch (e) {
      loi += 1;
      console.error(`[MinIO] LỖI "${cu}": ${e.message}`);
    }
  }

  console.log(`[MinIO] Xong: ${doi} object đã đổi, ${loi} lỗi.`);
  return { doi, loi };
}

async function capNhatDb() {
  console.log('\n[DB] Đang kiểm tra tb_BaiGiang...');

  const [truoc] = await sequelize.query(`
    SELECT Id, LinkBaiGiang, LinkChunkBaiGiang
    FROM tb_BaiGiang
    WHERE LinkBaiGiang LIKE '%/stream/%' OR LinkChunkBaiGiang LIKE '%/chunk/%'
  `);

  console.log(`[DB] ${truoc.length} bài giảng còn link theo cấu trúc cũ.`);
  for (const r of truoc.slice(0, 5)) {
    console.log(`   #${r.Id}: ${r.LinkBaiGiang} | ${r.LinkChunkBaiGiang}`);
  }

  if (!truoc.length) return 0;

  if (!APPLY) {
    console.log('[DB] Chế độ thử khan — chưa UPDATE. Thêm --apply để thực hiện.');
    return 0;
  }

  // Đảo 'stream'/'chunk' lên đầu chuỗi; độ dài không đổi nên VARCHAR(500) vẫn đủ.
  await sequelize.query(`
    UPDATE tb_BaiGiang
    SET LinkBaiGiang = 'stream/'
                     + LEFT(LinkBaiGiang, CHARINDEX('/stream/', LinkBaiGiang) - 1)
                     + SUBSTRING(LinkBaiGiang, CHARINDEX('/stream/', LinkBaiGiang) + 7, LEN(LinkBaiGiang))
    WHERE LinkBaiGiang LIKE '%/stream/%'
  `);

  await sequelize.query(`
    UPDATE tb_BaiGiang
    SET LinkChunkBaiGiang = 'chunk/'
                          + LEFT(LinkChunkBaiGiang, CHARINDEX('/chunk/', LinkChunkBaiGiang) - 1)
                          + SUBSTRING(LinkChunkBaiGiang, CHARINDEX('/chunk/', LinkChunkBaiGiang) + 6, LEN(LinkChunkBaiGiang))
    WHERE LinkChunkBaiGiang LIKE '%/chunk/%'
  `);

  const [conSot] = await sequelize.query(`
    SELECT COUNT(*) AS n FROM tb_BaiGiang
    WHERE LinkBaiGiang LIKE '%/stream/%' OR LinkChunkBaiGiang LIKE '%/chunk/%'
  `);

  console.log(`[DB] Đã cập nhật ${truoc.length} bài giảng; còn sót: ${conSot[0].n}.`);
  return truoc.length;
}

async function main() {
  console.log(APPLY ? '=== CHẠY THẬT (--apply) ===' : '=== THỬ KHAN (không ghi gì) ===');

  if (LAM_MINIO) await diChuyenObject();
  if (LAM_DB) await capNhatDb();

  console.log('\nHoàn tất.');
}

main()
  .catch((e) => {
    console.error('\nThất bại:', e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close().catch(() => {}));
