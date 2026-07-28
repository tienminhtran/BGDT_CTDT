/*
 * Điền DanhSachChunk + ThoiLuongGiay cho các bài giảng CŨ (upload trước khi có
 * worker cắt chunk nền, nên hai cột này đang NULL).
 *
 * KHÔNG cắt lại video: bản HLS đã nằm sẵn trên MinIO, script chỉ tải index.m3u8
 * về, phân tích rồi ghi kết quả vào DB. Không đụng ffmpeg, không đụng CPU, không
 * sửa một object nào trên MinIO.
 *
 * Cách chạy (trong thư mục IUH_BackEnd):
 *   node scripts/backfill-danh-sach-chunk.js                 # thử khan, KHÔNG ghi gì
 *   node scripts/backfill-danh-sach-chunk.js --apply         # ghi vào DB
 *   node scripts/backfill-danh-sach-chunk.js --apply --kiem-tra-segment
 *                                                           # đối chiếu từng .ts có thật trên MinIO
 *
 * An toàn:
 *   - Chỉ đụng dòng đã HoanThanh và DanhSachChunk đang NULL -> chạy lại nhiều lần
 *     không ghi đè dữ liệu do worker sinh ra.
 *   - Bỏ qua dòng đang DangCho/DangXuLy để không giẫm chân worker đang chạy.
 *   - Chỉ UPDATE 2 cột DanhSachChunk, ThoiLuongGiay; các cột khác giữ nguyên.
 */
require('dotenv').config();

const { Op } = require('sequelize');
const { minioClient, BUCKET, ensureBucket, toObjectKey } = require('../src/config/minio');
const { sequelize, BaiGiang, TRANG_THAI_XU_LY_CHUNK: TT } = require('../src/models/orm');
const { phanTichPlaylist } = require('../src/services/xuLyChunk.service');

const APPLY = process.argv.includes('--apply');
const KIEM_TRA_SEGMENT = process.argv.includes('--kiem-tra-segment');

// Tải nội dung 1 object trên MinIO về dưới dạng chuỗi.
async function taiVeChuoi(objectKey) {
  const stream = await minioClient.getObject(BUCKET, objectKey);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

// Kiểm tra mọi segment trong playlist có thật trên MinIO không.
async function doiChieuSegment(thuMuc, danhSach) {
  const thieu = [];
  for (const c of danhSach) {
    try {
      await minioClient.statObject(BUCKET, `${thuMuc}/${c.ten}`);
    } catch (_) {
      thieu.push(c.ten);
    }
  }
  return thieu;
}

async function main() {
  console.log(APPLY ? '=== CHẠY THẬT (--apply) ===' : '=== THỬ KHAN (không ghi gì) ===');
  await ensureBucket();

  const canLam = await BaiGiang.findAll({
    attributes: ['Id', 'TenBaiGiang', 'LinkChunkBaiGiang'],
    where: {
      TrangThaiXuLyChunk: TT.HOAN_THANH, // né dòng worker đang xử lý
      LinkChunkBaiGiang: { [Op.ne]: null },
      DanhSachChunk: null, // đã có dữ liệu thì không ghi đè
    },
    order: [['Id', 'ASC']],
  });

  console.log(`\nCó ${canLam.length} bài giảng cần điền DanhSachChunk/ThoiLuongGiay.`);
  if (!canLam.length) {
    console.log('Không có gì để làm.');
    return;
  }

  let xong = 0;
  let boQua = 0;
  let loi = 0;
  let tongGiay = 0;

  for (const bg of canLam) {
    const key = toObjectKey(bg.LinkChunkBaiGiang);
    const thuMuc = key.replace(/\/[^/]+$/, ''); // bỏ "index.m3u8"

    try {
      const noiDung = await taiVeChuoi(key);
      const { danhSach, tongThoiLuong } = phanTichPlaylist(noiDung);

      if (!danhSach.length) {
        boQua += 1;
        console.warn(`  #${bg.Id} BỎ QUA: playlist không có segment nào`);
        continue;
      }

      if (KIEM_TRA_SEGMENT) {
        const thieu = await doiChieuSegment(thuMuc, danhSach);
        if (thieu.length) {
          boQua += 1;
          console.warn(
            `  #${bg.Id} BỎ QUA: thiếu ${thieu.length}/${danhSach.length} segment trên MinIO ` +
              `(vd ${thieu[0]})`
          );
          continue;
        }
      }

      if (APPLY) {
        await BaiGiang.update(
          { DanhSachChunk: danhSach, ThoiLuongGiay: tongThoiLuong },
          { where: { Id: bg.Id } }
        );
      }

      xong += 1;
      tongGiay += tongThoiLuong;
      const phut = (tongThoiLuong / 60).toFixed(1);
      console.log(
        `  #${bg.Id} ${danhSach.length} segment, ${tongThoiLuong}s (${phut} phút)` +
          ` — ${String(bg.TenBaiGiang || '').slice(0, 45)}`
      );
    } catch (e) {
      loi += 1;
      // Playlist bị xóa khỏi MinIO nhưng DB còn link -> báo rõ để xử lý riêng.
      const lyDo = /not exist|NoSuchKey|404/i.test(e.message)
        ? 'không tìm thấy index.m3u8 trên MinIO'
        : e.message;
      console.error(`  #${bg.Id} LỖI: ${lyDo}`);
    }
  }

  console.log(
    `\nKết quả: ${xong} bài điền được, ${boQua} bỏ qua, ${loi} lỗi. ` +
      `Tổng thời lượng đọc ra: ${(tongGiay / 3600).toFixed(1)} giờ.`
  );
  if (!APPLY && xong) {
    console.log('Chế độ thử khan — chưa ghi gì. Thêm --apply để cập nhật DB.');
  }
}

main()
  .catch((e) => {
    console.error('\nThất bại:', e);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close().catch(() => {}));
