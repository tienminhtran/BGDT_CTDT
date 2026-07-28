const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const { QueryTypes, literal } = require('sequelize');
const { minioClient, BUCKET, ensureBucket, toObjectKey } = require('../config/minio');
const { sequelize, BaiGiang, TRANG_THAI_XU_LY_CHUNK: TT } = require('../models/orm');
const baiGiang = require('./baiGiang.service');
const spool = require('../utils/spoolVideo');

/**
 * Worker cắt chunk (HLS) chạy nền, tách hẳn khỏi request upload.
 *
 * Hàng đợi chính là bảng tb_BaiGiang (không cần Redis/BullMQ):
 *   API upload -> 'DangCho'
 *   worker claim -> 'DangXuLy' -> ffmpeg -> 'HoanThanh' | 'ThatBai'
 *
 * Bốn điểm khiến "DB làm hàng đợi" chạy đúng:
 *   1. Claim nguyên tử bằng UPDATE ... OUTPUT (xem claimJobs) - hai worker không
 *      bao giờ bốc trúng cùng một dòng.
 *   2. Chống tái nhập trong tiến trình (cờ dangQuet): một lượt quét chạy lâu hơn
 *      chu kỳ poll cũng không chồng lên chính nó.
 *   3. Quét job treo (quetJobTreo): worker chết giữa chừng thì dòng đó được trả về
 *      hàng đợi thay vì kẹt 'DangXuLy' vĩnh viễn.
 *   4. Backoff qua cột NgayThuLaiSauKhi: job lỗi không bị bốc lại ngay lượt kế tiếp.
 */

// ---------------------------------------------------------------- cấu hình

// Ưu tiên: FFMPEG_PATH (nếu khai báo) -> binary của ffmpeg-static -> 'ffmpeg' trên PATH
let ffmpegStatic = null;
try {
  ffmpegStatic = require('ffmpeg-static');
} catch (_) {
  /* không có ffmpeg-static thì bỏ qua */
}
const FFMPEG =
  (process.env.FFMPEG_PATH && process.env.FFMPEG_PATH.trim()) || ffmpegStatic || 'ffmpeg';

const HLS_TIME = parseInt(process.env.HLS_SEGMENT_TIME, 10) || 6; // độ dài mỗi chunk (giây)

// Số video được cắt song song. Mặc định 1: ffmpeg ăn gần trọn CPU cho mỗi tiến trình,
// chạy nhiều cùng lúc chỉ làm mọi job cùng chậm chứ không tăng thông lượng.
const CONCURRENCY = Math.max(1, parseInt(process.env.CHUNK_CONCURRENCY, 10) || 1);

const POLL_MS = (parseInt(process.env.CHUNK_POLL_SECONDS, 10) || 30) * 1000;

// Số lần thử LẠI sau lần chạy đầu (0 = chạy một lần, hỏng là thôi).
const MAX_RETRY = (() => {
  const v = parseInt(process.env.CHUNK_MAX_RETRY, 10);
  return Number.isFinite(v) && v >= 0 ? v : 3;
})();

// Job 'DangXuLy' quá lâu = worker đã chết -> trả về hàng đợi. Phải lớn hơn thời gian
// cắt video dài nhất thực tế, nếu không job đang chạy bình thường sẽ bị cướp.
const STALE_GIAY = (parseInt(process.env.CHUNK_STALE_MINUTES, 10) || 30) * 60;

// Chờ tăng dần giữa các lần thử: lỗi tạm (MinIO nghẽn) hồi nhanh, lỗi dai thì giãn ra.
const BACKOFF_GIAY = (process.env.CHUNK_BACKOFF_SECONDS || '5,30,120')
  .split(',')
  .map((s) => parseInt(s.trim(), 10))
  .filter((n) => Number.isFinite(n) && n >= 0);

// Job đang chạy tự làm mới NgayBatDauXuLy để quetJobTreo() không cướp mất job còn
// sống. Phải nhỏ hơn hẳn ngưỡng treo, lấy 1/3 và chặn trần 5 phút.
const NHIP_TIM_MS = Math.min(5 * 60 * 1000, Math.max(30_000, (STALE_GIAY * 1000) / 3));

/**
 * MỌI mốc thời gian dùng để SO SÁNH phải do SQL Server sinh ra (SYSUTCDATETIME()),
 * không dùng `new Date()` của Node.
 *
 * Lý do: DB này trả SYSUTCDATETIME() theo giờ máy chủ DB, còn Date của Node theo giờ
 * container. Máy dev đặt cùng múi giờ nên trùng nhau, nhưng container Docker thường
 * chạy TZ=UTC -> lệch 7 tiếng: NgayThuLaiSauKhi ghi bằng giờ Node luôn nhỏ hơn
 * SYSUTCDATETIME(), backoff mất tác dụng và job lỗi bị bốc lại liên tục.
 */
const BAY_GIO = () => literal('SYSUTCDATETIME()');
const SAU_N_GIAY = (giay) => literal(`DATEADD(SECOND, ${Number(giay) || 0}, SYSUTCDATETIME())`);

// ---------------------------------------------------------------- ffmpeg

// Chuyển video gốc -> HLS (index.m3u8 + các seg_*.ts) vào outDir bằng ffmpeg.
function transcodeToHls(inputPath, outDir) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-c:a', 'aac',
      '-hls_time', String(HLS_TIME),
      '-hls_playlist_type', 'vod',
      '-hls_segment_filename', path.join(outDir, 'seg_%03d.ts'),
      path.join(outDir, 'index.m3u8'),
    ];

    const proc = spawn(FFMPEG, args);
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (e) => {
      // Chỉ coi là "không có ffmpeg" khi đúng lỗi không tìm thấy binary (ENOENT).
      const err = new Error(`Không chạy được ffmpeg (${FFMPEG}): ${e.message}`);
      if (e.code === 'ENOENT') err.code = 'FFMPEG_UNAVAILABLE';
      reject(err);
    });
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`ffmpeg thoát với mã ${code}: ${stderr.slice(-500)}`));
    });
  });
}

/**
 * Phân tích nội dung index.m3u8 -> danh sách chunk + tổng thời lượng.
 * Playlist VOD có dạng: dòng "#EXTINF:<giây>," rồi tới dòng tên segment.
 *
 * Nhận chuỗi (không nhận đường dẫn) để dùng được cả cho playlist tải thẳng từ MinIO
 * - script backfill dữ liệu cũ đọc theo đường đó, khỏi ghi file tạm.
 * @returns {{ danhSach: Array<{thuTu:number, ten:string, thoiLuongGiay:number}>, tongThoiLuong:number }}
 */
function phanTichPlaylist(noiDung) {
  const lines = String(noiDung).split(/\r?\n/);
  const danhSach = [];
  let thoiLuong = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const v = parseFloat(line.slice('#EXTINF:'.length));
      thoiLuong = Number.isFinite(v) ? v : null;
      continue;
    }
    if (line.startsWith('#')) continue; // thẻ khác (#EXT-X-...) không phải segment

    // Tên segment sẽ được ghép thẳng vào object key trên MinIO và vào đường dẫn file
    // cục bộ khi upload -> chỉ nhận tên phẳng, chặn '..' và mọi dấu phân cách thư mục.
    if (!/^[\w.\-]+$/.test(line)) {
      throw new Error(`Playlist chứa tên segment không hợp lệ: ${line.slice(0, 80)}`);
    }

    danhSach.push({
      thuTu: danhSach.length,
      ten: line,
      thoiLuongGiay: thoiLuong == null ? null : Math.round(thoiLuong * 1000) / 1000,
    });
    thoiLuong = null;
  }

  const tongThoiLuong = danhSach.reduce((s, c) => s + (c.thoiLuongGiay || 0), 0);
  return { danhSach, tongThoiLuong: Math.round(tongThoiLuong * 1000) / 1000 };
}

// Đọc playlist từ file trên đĩa (đường dùng của worker sau khi ffmpeg chạy xong).
function docPlaylist(m3u8Path) {
  return phanTichPlaylist(fs.readFileSync(m3u8Path, 'utf8'));
}

// ---------------------------------------------------------------- hàng đợi

let demLuot = 0;

// Nhãn nhận dạng lượt claim, ghi vào MaJobXuLy để đối chiếu log khi có nhiều worker.
// Kết thúc bằng ':' vì câu UPDATE nối thẳng Id vào đuôi; cột chỉ 100 ký tự nên cắt ngắn.
function taoMaLuot() {
  return `${os.hostname()}:${process.pid}:${Date.now()}:${++demLuot}:bg`.slice(0, 70);
}

/**
 * Bốc tối đa `soLuong` job đang chờ và chuyển sang 'DangXuLy' trong MỘT câu lệnh.
 *
 * Bắt buộc phải nguyên tử: nếu SELECT rồi mới UPDATE, hai worker (hoặc hai lượt quét
 * chồng nhau) sẽ cùng thấy một dòng 'DangCho' và chạy ffmpeg hai lần trên cùng video.
 *   - OUTPUT ... INTO     : lấy về đúng những dòng lượt này giành được.
 *   - READPAST           : bỏ qua dòng worker khác đang khóa thay vì xếp hàng chờ.
 *   - UPDLOCK/ROWLOCK    : khóa ngay ở mức dòng khi đọc, không nâng cấp khóa giữa chừng.
 *
 * Bắt buộc OUTPUT ... INTO <biến bảng> chứ không OUTPUT thẳng: tb_BaiGiang có
 * trigger trg_BaiGiang_AfterUpdate đang bật, mà SQL Server cấm OUTPUT không kèm INTO
 * trên bảng có trigger ("...cannot have any enabled triggers if the statement
 * contains an OUTPUT clause without INTO clause").
 *
 * @returns {Promise<number[]>} id các bài giảng đã giành được
 */
async function claimJobs(soLuong) {
  const n = Math.max(1, parseInt(soLuong, 10) || 1);
  const rows = await sequelize.query(
    `DECLARE @daBoc TABLE (Id INT);

     UPDATE TOP (${n}) tb_BaiGiang WITH (READPAST, UPDLOCK, ROWLOCK)
     SET TrangThaiXuLyChunk = :dangXuLy,
         NgayBatDauXuLy = SYSUTCDATETIME(),
         MaJobXuLy = CONCAT(:maJob, CAST(Id AS NVARCHAR(20))),
         LoiXuLy = NULL
     OUTPUT inserted.Id INTO @daBoc (Id)
     WHERE TrangThaiXuLyChunk = :dangCho
       AND (NgayThuLaiSauKhi IS NULL OR NgayThuLaiSauKhi <= SYSUTCDATETIME());

     SELECT Id FROM @daBoc;`,
    {
      replacements: {
        dangXuLy: TT.DANG_XU_LY,
        dangCho: TT.DANG_CHO,
        maJob: taoMaLuot(),
      },
      type: QueryTypes.SELECT,
    }
  );

  // Tùy phiên bản driver, OUTPUT có thể về dạng [rows] lồng thêm 1 lớp -> phẳng hóa.
  const flat = Array.isArray(rows) ? rows.flat() : [];
  return flat.map((r) => r?.Id).filter((id) => Number.isInteger(id));
}

/**
 * Trả các job 'DangXuLy' quá hạn về hàng đợi.
 *
 * Worker bị kill giữa chừng (container restart, OOM) không kịp cập nhật trạng thái,
 * dòng đó sẽ kẹt 'DangXuLy' mãi vì claimJobs chỉ tìm 'DangCho'. Job quá hạn mà đã
 * dùng hết lượt thử thì cho thẳng sang 'ThatBai'.
 * @returns {Promise<number>} số dòng đã xử lý
 */
async function quetJobTreo() {
  const [, meta] = await sequelize.query(
    `UPDATE tb_BaiGiang
     SET TrangThaiXuLyChunk = CASE WHEN SoLanThuLai >= :maxRetry THEN :thatBai ELSE :dangCho END,
         SoLanThuLai = SoLanThuLai + 1,
         NgayThuLaiSauKhi = SYSUTCDATETIME(),
         LoiXuLy = CONCAT(N'Job treo quá ', :phut, N' phút (worker dừng giữa chừng), đã đưa lại hàng đợi')
     WHERE TrangThaiXuLyChunk = :dangXuLy
       AND NgayBatDauXuLy IS NOT NULL
       AND NgayBatDauXuLy < DATEADD(SECOND, :staleGiayAm, SYSUTCDATETIME())`,
    {
      replacements: {
        maxRetry: MAX_RETRY,
        thatBai: TT.THAT_BAI,
        dangCho: TT.DANG_CHO,
        dangXuLy: TT.DANG_XU_LY,
        phut: Math.round(STALE_GIAY / 60),
        // Truyền sẵn số âm: viết '-:staleGiay' thì Sequelize không nhận ra tham số
        // (dấu trừ dính liền dấu hai chấm) và để nguyên ':staleGiay' trong câu SQL.
        staleGiayAm: -STALE_GIAY,
      },
    }
  );
  const soDong = typeof meta === 'number' ? meta : meta?.rowCount ?? 0;
  if (soDong > 0) console.warn(`[chunk] Đưa lại hàng đợi ${soDong} job treo`);
  return soDong;
}

/**
 * Ghi nhận job lỗi: còn lượt thì hẹn giờ thử lại, hết lượt thì đánh 'ThatBai'.
 * Lỗi vĩnh viễn (thiếu ffmpeg, bài giảng không tồn tại) bỏ qua retry - thử lại
 * cũng hỏng y hệt, chỉ tốn CPU và làm nhiễu log.
 */
async function ganCoLoi(idBaiGiang, err, { vinhVien = false } = {}) {
  const bg = await BaiGiang.findByPk(idBaiGiang, { attributes: ['SoLanThuLai'] });
  const daThu = (bg?.SoLanThuLai ?? 0) + 1; // lần chạy vừa hỏng là lần thứ mấy
  const hetLuot = vinhVien || daThu > MAX_RETRY;

  // Lần hỏng thứ n dùng mốc chờ thứ n; quá danh sách thì giữ nguyên mốc cuối.
  const choGiay = BACKOFF_GIAY[Math.min(daThu - 1, BACKOFF_GIAY.length - 1)] ?? 60;

  await BaiGiang.update(
    {
      TrangThaiXuLyChunk: hetLuot ? TT.THAT_BAI : TT.DANG_CHO,
      SoLanThuLai: daThu,
      NgayThuLaiSauKhi: hetLuot ? null : SAU_N_GIAY(choGiay),
      LoiXuLy: String(err?.message || err).slice(0, 4000),
    },
    { where: { Id: idBaiGiang } }
  );

  if (hetLuot) {
    console.error(`[chunk] Bài giảng ${idBaiGiang} THẤT BẠI (lần ${daThu}):`, err?.message || err);
  } else {
    console.warn(
      `[chunk] Bài giảng ${idBaiGiang} lỗi lần ${daThu}, thử lại sau ${choGiay}s:`,
      err?.message || err
    );
  }
}

// ---------------------------------------------------------------- xử lý 1 job

/**
 * Lấy đường dẫn file video gốc trên đĩa để ffmpeg đọc.
 * Ưu tiên file spool (API upload để lại, khỏi tải lại); không còn thì tải từ MinIO.
 * @returns {Promise<{ duongDan:string, tuSpool:boolean }>}
 */
async function layFileNguon(idBaiGiang, linkBaiGiang, thuMucTam) {
  const tuSpool = spool.timFileSpool(idBaiGiang);
  if (tuSpool && fs.existsSync(tuSpool)) return { duongDan: tuSpool, tuSpool: true };

  const key = toObjectKey(linkBaiGiang);
  if (!key) {
    const err = new Error('Bài giảng chưa có video gốc để cắt chunk');
    err.loiVinhVien = true;
    throw err;
  }

  const dich = path.join(thuMucTam, `nguon${path.extname(key) || '.mp4'}`);
  await minioClient.fGetObject(BUCKET, key, dich);
  return { duongDan: dich, tuSpool: false };
}

/**
 * Định kỳ đẩy NgayBatDauXuLy lên hiện tại trong lúc job còn chạy.
 *
 * Không có nhịp tim thì một video dài hơn ngưỡng treo sẽ bị chính quetJobTreo() đưa
 * lại hàng đợi và một worker khác bốc lên cắt song song cùng video. Điều kiện
 * TrangThaiXuLyChunk='DangXuLy' đảm bảo nhịp tim tắt ngóm nếu job đã bị cướp thật.
 * @returns {() => void} hàm dừng nhịp tim
 */
function batDauNhipTim(idBaiGiang) {
  const timer = setInterval(() => {
    BaiGiang.update(
      { NgayBatDauXuLy: BAY_GIO() },
      { where: { Id: idBaiGiang, TrangThaiXuLyChunk: TT.DANG_XU_LY } }
    ).catch((e) => console.warn(`[chunk] Nhịp tim job ${idBaiGiang} lỗi:`, e.message));
  }, NHIP_TIM_MS);
  if (timer.unref) timer.unref();
  return () => clearInterval(timer);
}

/**
 * Cắt chunk cho 1 bài giảng đã được claim (đang ở trạng thái 'DangXuLy').
 * Xong xuôi mới ghi LinkChunkBaiGiang -> trong lúc chạy client vẫn thấy "đang xử lý"
 * chứ không thấy playlist dở dang.
 */
async function xuLyMotBaiGiang(idBaiGiang) {
  const batDau = Date.now();
  const thuMucTam = fs.mkdtempSync(path.join(os.tmpdir(), `hls-${idBaiGiang}-`));
  const dungNhipTim = batDauNhipTim(idBaiGiang);

  try {
    await ensureBucket();

    const bg = await BaiGiang.findByPk(idBaiGiang, { attributes: ['Id', 'LinkBaiGiang'] });
    if (!bg) {
      const err = new Error('Không tìm thấy bài giảng');
      err.loiVinhVien = true;
      throw err;
    }

    const viTri = await baiGiang.getViTriBaiGiang(idBaiGiang);
    const duongDan = baiGiang.duongDanBaiGiang(viTri);

    const { duongDan: fileNguon, tuSpool } = await layFileNguon(
      idBaiGiang,
      bg.LinkBaiGiang,
      thuMucTam
    );

    // Dọn chunk của lượt chạy trước (job treo/đã lỗi) trước khi ghi bộ mới: video mới
    // có thể ít segment hơn, sót seg_*.ts cũ sẽ nằm lại làm rác trong bucket.
    await baiGiang.xoaObjectTheoPrefix(duongDan.chunk);

    const hlsDir = path.join(thuMucTam, 'hls');
    fs.mkdirSync(hlsDir, { recursive: true });
    await transcodeToHls(fileNguon, hlsDir);

    const m3u8Path = path.join(hlsDir, 'index.m3u8');
    if (!fs.existsSync(m3u8Path)) {
      throw new Error('ffmpeg chạy xong nhưng không sinh ra index.m3u8');
    }
    const { danhSach, tongThoiLuong } = docPlaylist(m3u8Path);
    if (!danhSach.length) throw new Error('Playlist HLS rỗng (không có segment nào)');

    // Upload segment trước, playlist sau cùng: index.m3u8 xuất hiện đồng nghĩa
    // "đã đủ segment để phát", tránh client bốc được playlist trỏ vào file chưa có.
    for (const chunk of danhSach) {
      await baiGiang.uploadFile(`${duongDan.chunk}/${chunk.ten}`, path.join(hlsDir, chunk.ten));
    }
    const keyChunk = await baiGiang.uploadFile(`${duongDan.chunk}/index.m3u8`, m3u8Path);

    await BaiGiang.update(
      {
        LinkChunkBaiGiang: keyChunk,
        TrangThaiXuLyChunk: TT.HOAN_THANH,
        DanhSachChunk: danhSach,
        ThoiLuongGiay: tongThoiLuong,
        NgayHoanThanhXuLy: BAY_GIO(),
        LoiXuLy: null,
        NgayThuLaiSauKhi: null,
      },
      { where: { Id: idBaiGiang } }
    );

    spool.xoaFileSpool(idBaiGiang);
    console.log(
      `[chunk] Bài giảng ${idBaiGiang} xong: ${danhSach.length} segment, ` +
        `${tongThoiLuong}s video, nguồn=${tuSpool ? 'spool' : 'MinIO'}, ` +
        `mất ${Math.round((Date.now() - batDau) / 1000)}s`
    );
  } catch (err) {
    // Thiếu ffmpeg, bài giảng không tồn tại, thiếu liên kết môn học (404 từ
    // getViTriBaiGiang) -> chạy lại cũng hỏng y hệt, đánh thất bại luôn.
    const vinhVien =
      err.code === 'FFMPEG_UNAVAILABLE' || err.loiVinhVien === true || err.status === 404;
    await ganCoLoi(idBaiGiang, err, { vinhVien }).catch((e) =>
      console.error(`[chunk] Không ghi được lỗi cho bài giảng ${idBaiGiang}:`, e.message)
    );
  } finally {
    dungNhipTim();
    fs.rmSync(thuMucTam, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- vòng lặp

let pollTimer = null;
let dangQuet = false;              // chống hai lượt quét chồng nhau trong cùng tiến trình
const dangChay = new Map();        // idBaiGiang -> Promise đang xử lý

/**
 * Một lượt: dọn job treo rồi bốc job mới cho đủ hạn mức song song.
 * KHÔNG chờ job chạy xong - lượt quét chỉ lo phần claim, ffmpeg chạy tách ra để
 * chu kỳ poll tiếp theo vẫn tới đúng giờ.
 */
async function chayMotLuot() {
  if (dangQuet) return;
  dangQuet = true;
  try {
    await quetJobTreo().catch((e) => console.error('[chunk] Quét job treo lỗi:', e.message));

    const conTrong = CONCURRENCY - dangChay.size;
    if (conTrong <= 0) return;

    const ids = await claimJobs(conTrong);
    for (const id of ids) {
      const p = xuLyMotBaiGiang(id)
        .catch((e) => console.error(`[chunk] Lỗi ngoài dự kiến ở bài giảng ${id}:`, e.message))
        .finally(() => dangChay.delete(id));
      dangChay.set(id, p);
    }
  } catch (e) {
    console.error('[chunk] Lượt quét lỗi:', e.message);
  } finally {
    dangQuet = false;
  }
}

/**
 * Bật worker (gọi 1 lần khi server sẵn sàng).
 * Tắt bằng CHUNK_WORKER_ENABLED=false khi muốn tách worker sang container riêng -
 * lúc đó chỉ container worker bật cờ này, các instance API để tắt.
 */
function startWorkerLoop() {
  if (pollTimer) return;
  if (String(process.env.CHUNK_WORKER_ENABLED || 'true').toLowerCase() === 'false') {
    console.log('[chunk] Worker cắt chunk đang TẮT (CHUNK_WORKER_ENABLED=false)');
    return;
  }

  console.log(
    `[chunk] Worker bật: ffmpeg=${FFMPEG}, poll=${POLL_MS / 1000}s, ` +
      `song song=${CONCURRENCY}, retry tối đa=${MAX_RETRY}`
  );

  spool.ensureSpoolDir();
  chayMotLuot().catch(() => {}); // chạy ngay một lượt để nhặt job còn tồn từ lần chạy trước
  pollTimer = setInterval(() => chayMotLuot().catch(() => {}), POLL_MS);
  if (pollTimer.unref) pollTimer.unref(); // không giữ tiến trình sống chỉ vì timer
}

/**
 * Dừng nhận job mới. Cố ý KHÔNG chờ job đang chạy: ffmpeg có thể còn vài phút, giữ
 * tiến trình lại lúc shutdown sẽ bị hạ tầng kill cứng. Job dở dang nằm lại ở
 * 'DangXuLy' và được quetJobTreo() nhặt lại sau khi worker khởi động lại.
 */
function stopWorkerLoop() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

module.exports = {
  startWorkerLoop,
  stopWorkerLoop,
  chayMotLuot,
  claimJobs,
  quetJobTreo,
  xuLyMotBaiGiang,
  docPlaylist,
  phanTichPlaylist,
  transcodeToHls,
};
