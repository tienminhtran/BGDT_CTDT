const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const { getPool, sql } = require('../config/db');
const { minioClient, BUCKET, ensureBucket, toObjectKey } = require('../config/minio');
const model = require('../models/baiGiang.model');

const TABLE = model.table;

// Ưu tiên: FFMPEG_PATH (nếu khai báo) -> binary của ffmpeg-static -> 'ffmpeg' trên PATH
let ffmpegStatic = null;
try {
  ffmpegStatic = require('ffmpeg-static');
} catch (_) {
  /* không có ffmpeg-static thì bỏ qua */
}
const FFMPEG =
  (process.env.FFMPEG_PATH && process.env.FFMPEG_PATH.trim()) || ffmpegStatic || 'ffmpeg';
console.log('...ffmpeg dùng cho HLS:', FFMPEG);
const HLS_TIME = parseInt(process.env.HLS_SEGMENT_TIME, 10) || 6; // độ dài mỗi chunk (giây)

// Bỏ ký tự không an toàn cho đường dẫn object trên MinIO (giữ chữ, số, . _ -)
function sanitizeSegment(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^\w.\-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'unknown';
}

const CONTENT_TYPES = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
};

function contentTypeOf(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

/**
 * Lấy vị trí lưu trữ của 1 bài giảng: ma_tuquan (môn học) + version (phiên bản môn).
 * Đường đi quan hệ:
 *   tb_BaiGiang -> tb_ChiTietDangKyBaiGiang -> tb_DangKyBaiGiang
 *               -> tb_monhoc_version -> tb_monhoc
 * @returns {Promise<{ id:number, chiTietId:number, maTuQuan:string, version:string }>}
 */
async function getViTriBaiGiang(idBaiGiang) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, idBaiGiang)
    .query(`
      SELECT bg.Id AS id, ct.Id AS chiTietId, mh.ma_tuquan AS maTuQuan, mv.[version] AS version
      FROM ${TABLE} bg
      INNER JOIN tb_ChiTietDangKyBaiGiang ct ON bg.ChiTietDangKyBaiGiangId = ct.Id
      INNER JOIN tb_DangKyBaiGiang dk        ON ct.DangKyBaiGiangId = dk.Id
      INNER JOIN tb_monhoc_version mv         ON dk.MonHocVersionId = mv.id
      INNER JOIN tb_monhoc mh                 ON mv.id_monhoc = mh.id
      WHERE bg.Id = @id
    `);

  const row = result.recordset[0];
  if (!row) {
    const err = new Error('Không tìm thấy bài giảng hoặc thiếu liên kết môn học/phiên bản');
    err.status = 404;
    return Promise.reject(err);
  }
  return row;
}

// Chuyển video gốc -> HLS (index.m3u8 + các .ts) vào outDir bằng ffmpeg.
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

// Upload 1 file lên MinIO, trả về object key (đường dẫn tương đối) đã lưu.
async function uploadFile(objectName, filePath) {
  await minioClient.fPutObject(BUCKET, objectName, filePath, {
    'Content-Type': contentTypeOf(filePath),
  });
  return objectName;
}

// Lưu object key (tương đối) vào DB. KHÔNG lưu endpoint/bucket (lấy từ .env khi phát).
async function capNhatLink(idBaiGiang, keyBaiGiang, keyChunk) {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.Int, idBaiGiang)
    .input('link', sql.VarChar(500), keyBaiGiang)
    .input('chunk', sql.VarChar(sql.MAX), keyChunk)
    .query(
      `UPDATE ${TABLE} SET LinkBaiGiang = @link, LinkChunkBaiGiang = @chunk WHERE Id = @id`
    );
}

/**
 * Upload 1 video bài giảng lên MinIO.
 * Cấu trúc thư mục: [ma_tuquan]/[version]/[idChiTiet]/
 *   - stream/<file gốc>       -> LinkBaiGiang (video phát trực tiếp)
 *   - chunk/index.m3u8 + *.ts  -> LinkChunkBaiGiang (HLS, nếu có ffmpeg)
 *
 * DB chỉ lưu object key (đường dẫn tương đối), endpoint MinIO lấy từ .env.
 *
 * @param {number} idBaiGiang
 * @param {{ path:string, originalname:string }} file  file tạm do multer lưu
 * @returns {Promise<{ prefix, linkBaiGiang, linkChunkBaiGiang, hlsSkipped, message }>}
 */
async function uploadVideoBaiGiang(idBaiGiang, file) {
  if (!file || !file.path) {
    const err = new Error('Thiếu file video');
    err.status = 400;
    throw err;
  }

  await ensureBucket();
  const viTri = await getViTriBaiGiang(idBaiGiang);

  // Thư mục cấp 3 = id chi tiết đăng ký bài giảng (idChiTiet)
  const prefix = `${sanitizeSegment(viTri.maTuQuan)}/${sanitizeSegment(viTri.version)}/${viTri.chiTietId}`;

  // 1) Upload video gốc vào stream/ -> lưu object key
  const ext = path.extname(file.originalname || '') || '.mp4';
  const keyBaiGiang = await uploadFile(`${prefix}/stream/video${ext.toLowerCase()}`, file.path);

  // 2) Tạo HLS chunk vào chunk/ (nếu có ffmpeg)
  let keyChunk = null;
  let hlsSkipped = false;
  let message = 'Upload thành công';

  const hlsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-'));
  try {
    await transcodeToHls(file.path, hlsDir);

    const files = fs.readdirSync(hlsDir);
    for (const name of files) {
      await uploadFile(`${prefix}/chunk/${name}`, path.join(hlsDir, name));
    }
    keyChunk = `${prefix}/chunk/index.m3u8`;
  } catch (e) {
    if (e.code === 'FFMPEG_UNAVAILABLE') {
      hlsSkipped = true;
      message = 'Upload video gốc thành công; bỏ qua tạo HLS chunk vì không có ffmpeg';
    } else {
      throw e; // lỗi transcode thật sự -> báo ra ngoài
    }
  } finally {
    fs.rmSync(hlsDir, { recursive: true, force: true });
  }

  await capNhatLink(idBaiGiang, keyBaiGiang, keyChunk);

  // Không trả URL MinIO; chỉ báo trạng thái. Phát video qua proxy có token.
  return {
    prefix,
    coVideo: !!keyBaiGiang,
    coHls: !!keyChunk,
    hlsSkipped,
    message,
  };
}

/**
 * Danh sách chi tiết đăng ký bài giảng (các chương) theo phiên bản môn học,
 * kèm thông tin bài giảng (video) đã upload nếu có.
 */
async function listChiTietByVersion(monHocVersionId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('vid', sql.Int, monHocVersionId)
    .query(`
      SELECT ct.Id AS chiTietId, ct.NoiDungChuong, ct.GhiChu,
             dk.Id AS dangKyId,
             bg.Id AS baiGiangId, bg.TenBaiGiang,
             bg.LinkBaiGiang, bg.LinkChunkBaiGiang
      FROM tb_ChiTietDangKyBaiGiang ct
      INNER JOIN tb_DangKyBaiGiang dk ON ct.DangKyBaiGiangId = dk.Id
      LEFT JOIN ${TABLE} bg ON bg.ChiTietDangKyBaiGiangId = ct.Id
      WHERE dk.MonHocVersionId = @vid
      ORDER BY ct.Id
    `);

  // KHÔNG trả URL MinIO ra client. Chỉ trả cờ có video/HLS (xem trước qua proxy có token).
  return result.recordset.map((r) => ({
    chiTietId: r.chiTietId,
    NoiDungChuong: r.NoiDungChuong,
    GhiChu: r.GhiChu,
    dangKyId: r.dangKyId,
    baiGiangId: r.baiGiangId,
    TenBaiGiang: r.TenBaiGiang,
    coVideo: !!r.LinkBaiGiang,
    coHls: !!r.LinkChunkBaiGiang,
  }));
}

/**
 * Danh sách video bài giảng (đã upload) theo mã môn (ma_tuquan) + phiên bản.
 * Dùng cho trang xem bài giảng (CoursePlayer). version có thể bỏ trống = mọi phiên bản.
 */
async function listVideos(maMon, version) {
  const pool = await getPool();
  const req = pool.request().input('maMon', sql.NVarChar(20), maMon);

  let versionFilter = '';
  if (version) {
    req.input('version', sql.NVarChar(100), version);
    versionFilter = 'AND mv.[version] = @version';
  }

  const result = await req.query(`
    SELECT bg.Id AS baiGiangId, ct.Id AS chiTietId,
           ct.NoiDungChuong AS noiDungChuong,
           bg.TenBaiGiang AS tenBaiGiang,
           mv.[version] AS version,
           mh.tenmon AS tenMon,
           bg.LinkBaiGiang, bg.LinkChunkBaiGiang
    FROM tb_monhoc mh
    INNER JOIN tb_monhoc_version mv         ON mv.id_monhoc = mh.id
    INNER JOIN tb_DangKyBaiGiang dk         ON dk.MonHocVersionId = mv.id
    INNER JOIN tb_ChiTietDangKyBaiGiang ct  ON ct.DangKyBaiGiangId = dk.Id
    INNER JOIN ${TABLE} bg                   ON bg.ChiTietDangKyBaiGiangId = ct.Id
    WHERE mh.ma_tuquan = @maMon ${versionFilter}
      AND bg.LinkBaiGiang IS NOT NULL
    ORDER BY mv.[version], ct.Id
  `);

  // KHÔNG trả URL MinIO / mã môn ra client. Chỉ trả tên môn (hiển thị) + cờ video/HLS.
  const videos = result.recordset.map((r) => ({
    baiGiangId: r.baiGiangId,
    chiTietId: r.chiTietId,
    noiDungChuong: r.noiDungChuong,
    tenBaiGiang: r.tenBaiGiang,
    version: r.version,
    coVideo: !!r.LinkBaiGiang,
    coHls: !!r.LinkChunkBaiGiang,
  }));

  return { subjectName: result.recordset[0]?.tenMon ?? null, videos };
}

/**
 * Lấy Id bài giảng của 1 chi tiết đăng ký; nếu chưa có thì tạo mới (1-1).
 * Dùng trước khi upload video cho chương chưa có bài giảng.
 */
async function getOrCreateBaiGiang(chiTietId) {
  const pool = await getPool();

  const found = await pool
    .request()
    .input('ct', sql.Int, chiTietId)
    .query(`SELECT Id FROM ${TABLE} WHERE ChiTietDangKyBaiGiangId = @ct`);
  if (found.recordset[0]) return found.recordset[0].Id;

  const ct = await pool
    .request()
    .input('ct', sql.Int, chiTietId)
    .query(
      `SELECT Id, NoiDungChuong FROM tb_ChiTietDangKyBaiGiang WHERE Id = @ct`
    );
  if (!ct.recordset[0]) {
    const err = new Error('Không tìm thấy chi tiết đăng ký bài giảng');
    err.status = 404;
    throw err;
  }

  const inserted = await pool
    .request()
    .input('ct', sql.Int, chiTietId)
    .input('ten', sql.NVarChar(255), ct.recordset[0].NoiDungChuong)
    .query(
      `INSERT INTO ${TABLE} (ChiTietDangKyBaiGiangId, TenBaiGiang)
       OUTPUT INSERTED.Id VALUES (@ct, @ten)`
    );
  return inserted.recordset[0].Id;
}

// Lấy object key của thư mục chunk (vd "2101420/1/3/chunk") của 1 bài giảng.
async function getChunkDir(idBaiGiang) {
  const pool = await getPool();
  const r = await pool
    .request()
    .input('id', sql.Int, idBaiGiang)
    .query(`SELECT LinkChunkBaiGiang FROM ${TABLE} WHERE Id = @id`);

  const stored = r.recordset[0]?.LinkChunkBaiGiang;
  const key = toObjectKey(stored);
  if (!key) {
    const err = new Error('Bài giảng chưa có bản phát (HLS)');
    err.status = 404;
    throw err;
  }
  return path.posix.dirname(key); // bỏ "index.m3u8"
}

/**
 * Stream 1 file HLS (index.m3u8 hoặc seg_xxx.ts) của bài giảng từ MinIO ra response.
 * - .m3u8: đọc & viết lại để mỗi segment kèm ?token= (giữ xác thực cho từng .ts)
 * - .ts  : stream thẳng
 * @param {string} token  token đã xác thực ở controller (gắn lại vào playlist)
 */
async function streamHls(idBaiGiang, fileName, token, res) {
  // Chặn path traversal: chỉ cho tên file an toàn, đuôi .ts hoặc .m3u8
  if (!/^[\w.\-]+\.(ts|m3u8)$/i.test(fileName)) {
    const err = new Error('Tên file không hợp lệ');
    err.status = 400;
    throw err;
  }

  const dir = await getChunkDir(idBaiGiang);
  const objectName = `${dir}/${fileName}`;

  let stream;
  try {
    stream = await minioClient.getObject(BUCKET, objectName);
  } catch (e) {
    const err = new Error('Không tìm thấy file bài giảng');
    err.status = 404;
    throw err;
  }

  if (fileName.toLowerCase().endsWith('.m3u8')) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    let text = Buffer.concat(chunks).toString('utf8');
    // Gắn token vào từng dòng segment (dòng không bắt đầu bằng '#', không rỗng)
    text = text
      .split('\n')
      .map((line) => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return line;
        const sep = t.includes('?') ? '&' : '?';
        return `${t}${sep}token=${token}`;
      })
      .join('\n');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(text);
  }

  // .ts
  res.setHeader('Content-Type', 'video/mp2t');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  stream.on('error', () => res.destroy());
  return stream.pipe(res);
}

module.exports = {
  getViTriBaiGiang,
  uploadVideoBaiGiang,
  listVideos,
  listChiTietByVersion,
  getOrCreateBaiGiang,
  streamHls,
};
