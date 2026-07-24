const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const { Op } = require('sequelize');
const { minioClient, BUCKET, ensureBucket, toObjectKey } = require('../config/minio');
const {
  Monhoc,
  MonhocVersion,
  DangKyBaiGiang,
  ChiTietDangKyBaiGiang,
  BaiGiang,
} = require('../models/orm');

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

// Cấu trúc thư mục trên MinIO: [loại]/[ma_tuquan]/[version]/[idChiTiet]/<file>
//   stream/2101420/1/2/video.mp4      -> LinkBaiGiang
//   chunk/2101420/1/2/index.m3u8      -> LinkChunkBaiGiang (+ seg_*.ts cùng thư mục)
// Gom theo loại ở cấp gốc để tách hẳn video gốc (nặng, ít đọc) và bản HLS (nhiều object, đọc liên tục).
const THU_MUC_STREAM = 'stream';
const THU_MUC_CHUNK = 'chunk';

/**
 * Dựng các đường dẫn MinIO của 1 bài giảng từ vị trí lưu trữ (xem getViTriBaiGiang).
 * @returns {{ duoi:string, stream:string, chunk:string }}
 *   duoi   : phần chung "[ma_tuquan]/[version]/[idChiTiet]"
 *   stream : thư mục chứa video gốc
 *   chunk  : thư mục chứa HLS
 */
function duongDanBaiGiang(viTri) {
  const duoi = `${sanitizeSegment(viTri.maTuQuan)}/${sanitizeSegment(viTri.version)}/${viTri.chiTietId}`;
  return {
    duoi,
    stream: `${THU_MUC_STREAM}/${duoi}`,
    chunk: `${THU_MUC_CHUNK}/${duoi}`,
  };
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
  const bg = await BaiGiang.findByPk(idBaiGiang, {
    attributes: ['Id'],
    include: [
      {
        model: ChiTietDangKyBaiGiang,
        as: 'ChiTiet',
        attributes: ['Id'],
        required: true,
        include: [
          {
            model: DangKyBaiGiang,
            as: 'DangKy',
            attributes: ['Id'],
            required: true,
            include: [
              {
                model: MonhocVersion,
                as: 'MonHocVersion',
                attributes: ['version'],
                required: true,
                include: [
                  { model: Monhoc, as: 'Monhoc', attributes: ['ma_tuquan'], required: true },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const mv = bg?.ChiTiet?.DangKy?.MonHocVersion;
  if (!bg || !mv || !mv.Monhoc) {
    const err = new Error('Không tìm thấy bài giảng hoặc thiếu liên kết môn học/phiên bản');
    err.status = 404;
    return Promise.reject(err);
  }

  return {
    id: bg.Id,
    chiTietId: bg.ChiTiet.Id,
    maTuQuan: mv.Monhoc.ma_tuquan,
    version: mv.version,
  };
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

// Liệt kê tên các object dưới 1 prefix trên MinIO (đệ quy).
async function listObjectNames(prefix) {
  const names = [];
  const stream = minioClient.listObjectsV2(BUCKET, `${prefix}/`, true);
  for await (const obj of stream) {
    if (obj.name) names.push(obj.name);
  }
  return names;
}

/**
 * Xác định trạng thái lưu trữ của 1 bài giảng dựa trên 2 thư mục stream/ và chunk/:
 *   - 'completed'  : stream có video + chunk có index.m3u8 và >=1 segment .ts
 *                    -> đã upload & xử lý xong, KHÔNG cho upload nữa.
 *   - 'processing' : stream đã có video nhưng chunk chưa tạo xong (thiếu m3u8 hoặc .ts)
 *                    -> video đang xử lý, KHÔNG cho upload.
 *   - 'empty'      : chưa có stream lẫn chunk -> CHO PHÉP upload.
 * @param {{ stream:string, chunk:string }} duongDan kết quả của duongDanBaiGiang()
 * @returns {Promise<{ canUpload:boolean, status:string, message:string, coStream:boolean, coChunk:boolean }>}
 */
async function trangThaiUploadTheoDuongDan(duongDan) {
  const [streamFiles, chunkFiles] = await Promise.all([
    listObjectNames(duongDan.stream),
    listObjectNames(duongDan.chunk),
  ]);

  const coStream = streamFiles.length > 0;
  const coM3u8 = chunkFiles.some((n) => n.toLowerCase().endsWith('.m3u8'));
  const coSegment = chunkFiles.some((n) => n.toLowerCase().endsWith('.ts'));
  const chunkHoanThanh = coM3u8 && coSegment;

  // 1) Đã có video stream + chunk hoàn chỉnh -> đã upload xong
  if (coStream && chunkHoanThanh) {
    return {
      canUpload: false,
      status: 'completed',
      message: 'Bài giảng đã có video, không thể upload thêm',
      coStream: true,
      coChunk: true,
    };
  }

  // 2) Đã có video stream nhưng chunk chưa tạo xong -> đang xử lý
  if (coStream) {
    return {
      canUpload: false,
      status: 'processing',
      message: 'Video đang xử lý, vui lòng thử lại sau',
      coStream: true,
      coChunk: false,
    };
  }

  // 3) Chưa có gì -> cho phép upload
  return {
    canUpload: true,
    status: 'empty',
    message: 'Chưa có video, có thể upload',
    coStream: false,
    coChunk: false,
  };
}

/**
 * Kiểm tra trạng thái thư mục lưu trữ của 1 bài giảng trước khi upload video.
 * Dùng cho client check trước (GET) và cho chính uploadVideoBaiGiang chặn upload.
 * @param {number} idBaiGiang
 * @returns {Promise<{ canUpload, status, message, prefix, prefixStream, prefixChunk, coStream, coChunk }>}
 */
async function kiemTraTrangThaiUpload(idBaiGiang) {
  await ensureBucket();
  const viTri = await getViTriBaiGiang(idBaiGiang);
  const duongDan = duongDanBaiGiang(viTri);
  const trangThai = await trangThaiUploadTheoDuongDan(duongDan);
  return {
    ...trangThai,
    prefix: duongDan.duoi, // phần chung [ma_tuquan]/[version]/[idChiTiet]
    prefixStream: duongDan.stream,
    prefixChunk: duongDan.chunk,
  };
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
  await BaiGiang.update(
    { LinkBaiGiang: keyBaiGiang, LinkChunkBaiGiang: keyChunk },
    { where: { Id: idBaiGiang } }
  );
}

/**
 * Upload 1 video bài giảng lên MinIO.
 * Cấu trúc thư mục (đuôi chung = [ma_tuquan]/[version]/[idChiTiet]):
 *   - stream/<đuôi>/video.<ext>          -> LinkBaiGiang (video gốc)
 *   - chunk/<đuôi>/index.m3u8 + *.ts     -> LinkChunkBaiGiang (HLS, nếu có ffmpeg)
 *
 * DB chỉ lưu object key (đường dẫn tương đối), endpoint MinIO lấy từ .env.
 *
 * @param {number} idBaiGiang
 * @param {{ path:string, originalname:string }} file  file tạm do multer lưu
 * @returns {Promise<{ prefix, coVideo, coHls, hlsSkipped, message }>}
 */
async function uploadVideoBaiGiang(idBaiGiang, file) {
  if (!file || !file.path) {
    const err = new Error('Thiếu file video');
    err.status = 400;
    throw err;
  }

  await ensureBucket();
  const viTri = await getViTriBaiGiang(idBaiGiang);

  // Thư mục cấp cuối = id chi tiết đăng ký bài giảng (idChiTiet)
  const duongDan = duongDanBaiGiang(viTri);

  // 0) Kiểm tra trạng thái thư mục: đã có video / đang xử lý -> chặn upload.
  const trangThai = await trangThaiUploadTheoDuongDan(duongDan);
  if (!trangThai.canUpload) {
    const err = new Error(trangThai.message);
    err.status = 409; // Conflict: bài giảng đã có video hoặc đang xử lý
    err.trangThai = trangThai.status;
    throw err;
  }

  // 1) Upload video gốc vào stream/... -> lưu object key
  const ext = path.extname(file.originalname || '') || '.mp4';
  const keyBaiGiang = await uploadFile(`${duongDan.stream}/video${ext.toLowerCase()}`, file.path);

  // 2) Tạo HLS chunk vào chunk/... (nếu có ffmpeg)
  let keyChunk = null;
  let hlsSkipped = false;
  let message = 'Upload thành công';

  const hlsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hls-'));
  try {
    await transcodeToHls(file.path, hlsDir);

    const files = fs.readdirSync(hlsDir);
    for (const name of files) {
      await uploadFile(`${duongDan.chunk}/${name}`, path.join(hlsDir, name));
    }
    keyChunk = `${duongDan.chunk}/index.m3u8`;
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
    prefix: duongDan.duoi,
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
  const rows = await ChiTietDangKyBaiGiang.findAll({
    attributes: ['Id', 'NoiDungChuong', 'GhiChu', 'DangKyBaiGiangId'],
    include: [
      {
        model: DangKyBaiGiang,
        as: 'DangKy',
        attributes: ['Id'],
        required: true,
        where: { MonHocVersionId: monHocVersionId },
      },
      {
        model: BaiGiang,
        as: 'BaiGiang',
        attributes: ['Id', 'TenBaiGiang', 'LinkBaiGiang', 'LinkChunkBaiGiang'],
        required: false,
      },
    ],
    // Sắp theo SoThuTu chương (số thứ tự), Id ASC làm tie-breaker khi SoThuTu trùng/null.
    order: [
      ['SoThuTu', 'ASC'],
      ['Id', 'ASC'],
    ],
  });

  // KHÔNG trả URL MinIO ra client. Chỉ trả cờ có video/HLS (xem trước qua proxy có token).
  return rows.map((ct) => ({
    chiTietId: ct.Id,
    NoiDungChuong: ct.NoiDungChuong,
    GhiChu: ct.GhiChu,
    dangKyId: ct.DangKyBaiGiangId,
    baiGiangId: ct.BaiGiang?.Id ?? null,
    TenBaiGiang: ct.BaiGiang?.TenBaiGiang ?? null,
    coVideo: !!ct.BaiGiang?.LinkBaiGiang,
    coHls: !!ct.BaiGiang?.LinkChunkBaiGiang,
  }));
}





/**
 * Danh sách video bài giảng (đã upload) theo mã môn (ma_tuquan) + phiên bản.
 * Dùng cho trang xem bài giảng (CoursePlayer). version có thể bỏ trống = mọi phiên bản.
 */
async function listVideos(maMon, version) {
  // Lọc theo phiên bản (tùy chọn) trên tb_monhoc_version.
  const versionWhere = version ? { version } : undefined;

  const rows = await BaiGiang.findAll({
    attributes: ['Id', 'TenBaiGiang', 'NoiDungBaiGiang', 'LinkBaiGiang', 'LinkChunkBaiGiang', 'LuotXem'],
    where: { LinkBaiGiang: { [Op.ne]: null } },
    include: [
      {
        model: ChiTietDangKyBaiGiang,
        as: 'ChiTiet',
        attributes: ['Id', 'NoiDungChuong'],
        required: true,
        include: [
          {
            model: DangKyBaiGiang,
            as: 'DangKy',
            attributes: ['Id'],
            required: true,
            include: [
              {
                model: MonhocVersion,
                as: 'MonHocVersion',
                attributes: ['version'],
                required: true,
                where: versionWhere,
                include: [
                  {
                    model: Monhoc,
                    as: 'Monhoc',
                    attributes: ['tenmon'],
                    required: true,
                    where: { ma_tuquan: maMon },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    order: [
      [
        { model: ChiTietDangKyBaiGiang, as: 'ChiTiet' },
        { model: DangKyBaiGiang, as: 'DangKy' },
        { model: MonhocVersion, as: 'MonHocVersion' },
        'version',
        'ASC',
      ],
      // Sắp theo SoThuTu chương (số thứ tự), Id ASC làm tie-breaker khi SoThuTu trùng/null.
      [{ model: ChiTietDangKyBaiGiang, as: 'ChiTiet' }, 'SoThuTu', 'ASC'],
      [{ model: ChiTietDangKyBaiGiang, as: 'ChiTiet' }, 'Id', 'ASC'],
    ],
  });

  // Khi KHÔNG chỉ định version: chỉ lấy phiên bản MỚI NHẤT *có video*.
  // rows đã lọc LinkBaiGiang != null nên mọi version xuất hiện đều có video;
  // nếu bản mới nhất chưa có video thì nó không nằm trong rows -> tự lùi sang bản kế có video.
  let selected = rows;
  if (!version && rows.length) {
    const versionsCoVideo = [
      ...new Set(rows.map((bg) => bg.ChiTiet.DangKy.MonHocVersion.version)),
    ];
    // "Mới nhất" = version lớn nhất theo so sánh số (numeric-aware, vd '10' > '9').
    const newest = versionsCoVideo.sort((a, b) =>
      String(b).localeCompare(String(a), undefined, { numeric: true, sensitivity: 'base' })
    )[0];
    selected = rows.filter((bg) => bg.ChiTiet.DangKy.MonHocVersion.version === newest);
  }

  // KHÔNG trả URL MinIO / mã môn ra client. Chỉ trả tên môn (hiển thị) + cờ video/HLS.
  const videos = selected.map((bg) => ({
    baiGiangId: bg.Id,
    chiTietId: bg.ChiTiet.Id,
    noiDungChuong: bg.ChiTiet.NoiDungChuong,
    noiDungBaiGiang: bg.NoiDungBaiGiang,
    tenBaiGiang: bg.TenBaiGiang,
    version: bg.ChiTiet.DangKy.MonHocVersion.version,
    coVideo: !!bg.LinkBaiGiang,
    coHls: !!bg.LinkChunkBaiGiang,
    luotXem: bg.LuotXem ?? 0,
  }));

  const subjectName = selected[0]?.ChiTiet?.DangKy?.MonHocVersion?.Monhoc?.tenmon ?? null;
  return { subjectName, videos };
}





/**
 * Lấy thông tin 1 bài giảng theo Id (tb_BaiGiang) để xem riêng lẻ.
 * Trả về metadata để hiển thị + cờ video/HLS. KHÔNG trả URL MinIO ra client.
 * @param {number} idBaiGiang
 * @returns {Promise<{ baiGiangId, chiTietId, tenBaiGiang, noiDungChuong, subjectName, version, coVideo, coHls }>}
 */
async function getBaiGiangById(idBaiGiang) {
  const bg = await BaiGiang.findByPk(idBaiGiang, {
    attributes: ['Id', 'TenBaiGiang', 'NoiDungBaiGiang', 'LinkBaiGiang', 'LinkChunkBaiGiang', 'LuotXem'],
    include: [
      {
        model: ChiTietDangKyBaiGiang,
        as: 'ChiTiet',
        attributes: ['Id', 'NoiDungChuong'],
        required: true,
        include: [
          {
            model: DangKyBaiGiang,
            as: 'DangKy',
            attributes: ['Id'],
            required: true,
            include: [
              {
                model: MonhocVersion,
                as: 'MonHocVersion',
                attributes: ['version'],
                required: true,
                include: [
                  { model: Monhoc, as: 'Monhoc', attributes: ['tenmon'], required: true },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  if (!bg) {
    const err = new Error('Không tìm thấy bài giảng, vui lòng chọn lại bài giảng khác');
    err.status = 404;
    throw err;
  }

  const mv = bg.ChiTiet.DangKy.MonHocVersion;
  return {
    baiGiangId: bg.Id,
    chiTietId: bg.ChiTiet.Id,
    tenBaiGiang: bg.TenBaiGiang,
    noiDungChuong: bg.ChiTiet.NoiDungChuong,
    noiDungBaiGiang: bg.NoiDungBaiGiang,
    subjectName: mv.Monhoc.tenmon,
    version: mv.version,
    coVideo: !!bg.LinkBaiGiang,
    coHls: !!bg.LinkChunkBaiGiang,
    luotXem: bg.LuotXem ?? 0,
  };
}

/**
 * Lấy Id bài giảng của 1 chi tiết đăng ký; nếu chưa có thì tạo mới (1-1).
 * Dùng trước khi upload video cho chương chưa có bài giảng.
 */
async function getOrCreateBaiGiang(chiTietId) {
  const found = await BaiGiang.findOne({
    attributes: ['Id'],
    where: { ChiTietDangKyBaiGiangId: chiTietId },
  });
  if (found) return found.Id;

  const ct = await ChiTietDangKyBaiGiang.findByPk(chiTietId, {
    attributes: ['Id', 'NoiDungChuong'],
  });
  if (!ct) {
    const err = new Error('Không tìm thấy chi tiết đăng ký bài giảng');
    err.status = 404;
    throw err;
  }

  const created = await BaiGiang.create({
    ChiTietDangKyBaiGiangId: chiTietId,
    TenBaiGiang: ct.NoiDungChuong,
  });
  return created.Id;
}

// Lấy object key của thư mục chunk (vd "2101420/1/3/chunk") của 1 bài giảng.
async function getChunkDir(idBaiGiang) {
  const bg = await BaiGiang.findByPk(idBaiGiang, {
    attributes: ['LinkChunkBaiGiang'],
  });

  const stored = bg?.LinkChunkBaiGiang;
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
 * - .m3u8: stream thẳng; các segment (seg_xxx.ts) cùng path với playlist nên được
 *          xác thực bằng cookie HttpOnly (không nhúng token vào URL playlist nữa).
 * - .ts  : stream thẳng
 */
async function streamHls(idBaiGiang, fileName, res) {
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
    const text = Buffer.concat(chunks).toString('utf8');
    // Không nhúng token vào URL segment: mỗi seg_xxx.ts cùng path với playlist nên
    // trình duyệt tự gửi cookie HttpOnly khi tải -> giữ xác thực mà không lộ token.
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


/**
 * xóa video bài giảng (truyền paramater id bài giảng, paramater(KEY_LOGIN_TEACHER: đúng mới xóa)
 * @param {number} idBaiGiang
 * @param {string} teacherKey
 * @returns {Promise<{ message: string }>}
 */
async function deleteVideo(idBaiGiang, teacherKey) {
  if (!process.env.KEY_LOGIN_TEACHER || teacherKey !== process.env.KEY_LOGIN_TEACHER) {
    const err = new Error('Key giảng viên không hợp lệ');
    err.status = 401;
    throw err;
  }
  
  const bg = await BaiGiang.findByPk(idBaiGiang, {
    attributes: ['Id', 'LinkBaiGiang', 'LinkChunkBaiGiang', 'DaKhoa'],
  });
  if (!bg) {
    const err = new Error('Không tìm thấy bài giảng');
    err.status = 404;
    throw err;
  }

  // Bài giảng đã khóa -> cấm xóa. Cột là BIT NULL nên null/0 đều coi như chưa khóa.
  // Chặn ở đây (dữ liệu đã có sẵn trong RAM) trước khi đụng tới MinIO cho rẻ.
  // message được controller trả thẳng cho client: res.status(403).json({ message }).
  if (bg.DaKhoa) {
    const err = new Error('Không thể xóa bài giảng đã khóa');
    err.status = 403;
    // thông báo mess, thay vì 403
    err.message = 'Không thể xóa bài giảng đã khóa';
    throw err;
  }

  await ensureBucket();
  const viTri = await getViTriBaiGiang(idBaiGiang);
  const duongDan = duongDanBaiGiang(viTri);

  // CHỈ cho xóa khi video đã hoàn chỉnh: có đủ stream (video.*) + chunk (index.m3u8 + >=1 .ts).
  // Tránh xóa nhầm khi đang upload dang dở/đang xử lý hoặc khi chưa có video.
  const trangThai = await trangThaiUploadTheoDuongDan(duongDan);
  if (trangThai.status !== 'completed') {
    const err = new Error(
      trangThai.status === 'processing'
        ? 'Video đang xử lý (chưa có đủ chunk), không thể xóa'
        : 'Bài giảng chưa có đầy đủ stream và chunk, không thể xóa'
    );
    err.status = 409;
    throw err;
  }

  // Xóa TOÀN BỘ object của bài giảng trên MinIO. stream/ và chunk/ nằm ở 2 nhánh
  // gốc khác nhau nên phải liệt kê & xóa từng nhánh, không gộp 1 prefix được.
  const [streamKeys, chunkKeys] = await Promise.all([
    listObjectNames(duongDan.stream),
    listObjectNames(duongDan.chunk),
  ]);
  const objectKeysToDelete = [...streamKeys, ...chunkKeys];

  if (objectKeysToDelete.length > 0) {
    await minioClient.removeObjects(BUCKET, objectKeysToDelete);
  }

  // Cập nhật cơ sở dữ liệu để xóa liên kết video và chunk
  await BaiGiang.update(
    { LinkBaiGiang: null, LinkChunkBaiGiang: null },
    { where: { Id: idBaiGiang } }
  );

  return { message: 'Xóa video bài giảng thành công' };
}

/**
 * Từ 1 danh sách mã môn (ma_tuquan), trả về tập mã môn CÓ ÍT NHẤT 1 video
 * (tb_BaiGiang.LinkBaiGiang != null), bất kể phiên bản. Dùng để quyết định
 * bật/tắt nút "Xem bài giảng" theo tình trạng video thực tế.
 *
 * @param {string[]} maMonList
 * @returns {Promise<Set<string>>} tập ma_tuquan có video
 */
async function getMaMonCoVideo(maMonList) {
  const list = [...new Set((maMonList || []).filter(Boolean))];
  if (!list.length) return new Set();

  const rows = await BaiGiang.findAll({
    attributes: ['Id'],
    where: { LinkBaiGiang: { [Op.ne]: null } },
    include: [
      {
        model: ChiTietDangKyBaiGiang,
        as: 'ChiTiet',
        attributes: ['Id'],
        required: true,
        include: [
          {
            model: DangKyBaiGiang,
            as: 'DangKy',
            attributes: ['Id'],
            required: true,
            include: [
              {
                model: MonhocVersion,
                as: 'MonHocVersion',
                attributes: ['id'],
                required: true,
                include: [
                  {
                    model: Monhoc,
                    as: 'Monhoc',
                    attributes: ['ma_tuquan'],
                    required: true,
                    where: { ma_tuquan: { [Op.in]: list } },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const found = new Set();
  for (const bg of rows) {
    const ma = bg.ChiTiet?.DangKy?.MonHocVersion?.Monhoc?.ma_tuquan;
    if (ma) found.add(ma);
  }
  return found;
}

module.exports = {
  getViTriBaiGiang,
  kiemTraTrangThaiUpload,
  uploadVideoBaiGiang,
  listVideos,
  listChiTietByVersion,
  getBaiGiangById,
  getOrCreateBaiGiang,
  streamHls,
  deleteVideo,
  getMaMonCoVideo,
};
