const path = require('path');

const { Op } = require('sequelize');
const { minioClient, BUCKET, ensureBucket, toObjectKey } = require('../config/minio');
const {
  Monhoc,
  MonhocVersion,
  DangKyBaiGiang,
  ChiTietDangKyBaiGiang,
  BaiGiang,
  TRANG_THAI_XU_LY_CHUNK: TT,
} = require('../models/orm');
const spool = require('../utils/spoolVideo');

// Phần ffmpeg/HLS nằm ở xuLyChunk.service.js (worker nền) - service này chỉ lo
// MinIO + DB, không còn transcode trong request nữa.

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

// Liệt kê tên các object dưới 1 prefix trên MinIO (đệ quy).
async function listObjectNames(prefix) {
  const names = [];
  const stream = minioClient.listObjectsV2(BUCKET, `${prefix}/`, true);
  for await (const obj of stream) {
    if (obj.name) names.push(obj.name);
  }
  return names;
}

// Xóa toàn bộ object dưới 1 prefix trên MinIO. Không có gì để xóa thì bỏ qua.
async function xoaObjectTheoPrefix(prefix) {
  const keys = await listObjectNames(prefix);
  if (keys.length) await minioClient.removeObjects(BUCKET, keys);
  return keys.length;
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
 * Trạng thái xử lý của 1 bài giảng. NGUỒN SỰ THẬT là cột TrangThaiXuLyChunk trong DB,
 * không phải danh sách object trên MinIO.
 *
 * Lý do: từ khi cắt chunk chạy nền, "có video gốc nhưng chưa có chunk" là trạng thái
 * bình thường và kéo dài (đang xếp hàng chờ worker), không còn là dấu hiệu bất thường
 * như thời còn cắt chunk ngay trong request. Suy trạng thái từ MinIO sẽ không phân biệt
 * được "đang chờ", "đang chạy" và "đã thất bại".
 *
 * Riêng bài giảng cũ (TrangThaiXuLyChunk vẫn là 'ChuaXuLy' vì upload từ trước khi có
 * worker) thì đối chiếu MinIO như logic cũ - xem trangThaiUploadTheoDuongDan.
 *
 * @returns {Promise<{ canUpload, status, trangThaiXuLy, message, coStream, coChunk }>}
 *   status: 'empty' | 'processing' | 'completed' | 'failed' (giữ nguyên bộ giá trị cũ
 *   để client hiện có không vỡ, chỉ thêm 'failed')
 */
async function trangThaiUploadTheoBaiGiang(idBaiGiang, duongDan) {
  const bg = await BaiGiang.findByPk(idBaiGiang, {
    attributes: ['Id', 'LinkBaiGiang', 'LinkChunkBaiGiang', 'TrangThaiXuLyChunk', 'LoiXuLy'],
  });

  const trangThaiXuLy = bg?.TrangThaiXuLyChunk || TT.CHUA_XU_LY;
  const coStream = !!bg?.LinkBaiGiang;
  const coChunk = !!bg?.LinkChunkBaiGiang;

  // Đang xếp hàng hoặc worker đang chạy -> chặn upload đè lên chính video đang xử lý.
  if (trangThaiXuLy === TT.DANG_CHO || trangThaiXuLy === TT.DANG_XU_LY) {
    return {
      canUpload: false,
      status: 'processing',
      trangThaiXuLy,
      message:
        trangThaiXuLy === TT.DANG_CHO
          ? 'Video đang chờ xử lý, vui lòng thử lại sau'
          : 'Video đang được xử lý, vui lòng thử lại sau',
      coStream,
      coChunk,
    };
  }

  if (trangThaiXuLy === TT.HOAN_THANH) {
    return {
      canUpload: false,
      status: 'completed',
      trangThaiXuLy,
      message: 'Bài giảng đã có video, không thể upload thêm',
      coStream,
      coChunk,
    };
  }

  // Thất bại -> CHO upload lại: đó là cách giảng viên tự chạy lại sau khi đã hết lượt retry.
  if (trangThaiXuLy === TT.THAT_BAI) {
    return {
      canUpload: true,
      status: 'failed',
      trangThaiXuLy,
      message: `Xử lý video thất bại${bg?.LoiXuLy ? `: ${bg.LoiXuLy}` : ''}. Có thể upload lại.`,
      coStream,
      coChunk,
    };
  }

  // 'ChuaXuLy': dữ liệu cũ (hoặc chưa từng upload) -> giữ nguyên cách cũ là soi MinIO.
  return { ...(await trangThaiUploadTheoDuongDan(duongDan)), trangThaiXuLy };
}

/**
 * Kiểm tra trạng thái lưu trữ của 1 bài giảng trước khi upload video.
 * Dùng cho client check trước (GET) và cho chính uploadVideoBaiGiang chặn upload.
 * @param {number} idBaiGiang
 * @returns {Promise<{ canUpload, status, trangThaiXuLy, message, prefix, prefixStream, prefixChunk, coStream, coChunk }>}
 */
async function kiemTraTrangThaiUpload(idBaiGiang) {
  await ensureBucket();
  const viTri = await getViTriBaiGiang(idBaiGiang);
  const duongDan = duongDanBaiGiang(viTri);
  const trangThai = await trangThaiUploadTheoBaiGiang(idBaiGiang, duongDan);
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

/**
 * Upload 1 video bài giảng lên MinIO rồi ĐƯA VÀO HÀNG ĐỢI cắt chunk, KHÔNG chạy
 * ffmpeg tại đây.
 *
 * Trước kia hàm này transcode HLS ngay trong request: một video dài chiếm CPU hàng
 * phút và giữ kết nối HTTP suốt thời gian đó, làm nghẽn cả các request khác. Giờ API
 * chỉ đẩy file gốc lên MinIO, đánh dấu 'DangCho' rồi trả về ngay; worker nền
 * (xuLyChunk.service) sẽ bốc job và cắt chunk với số job song song có giới hạn.
 *
 * Cấu trúc thư mục (đuôi chung = [ma_tuquan]/[version]/[idChiTiet]):
 *   - stream/<đuôi>/video.<ext>          -> LinkBaiGiang (video gốc, ghi ở đây)
 *   - chunk/<đuôi>/index.m3u8 + *.ts     -> LinkChunkBaiGiang (worker ghi sau)
 *
 * DB chỉ lưu object key (đường dẫn tương đối), endpoint MinIO lấy từ .env.
 *
 * @param {number} idBaiGiang
 * @param {{ path:string, originalname:string }} file  file tạm do multer lưu
 * @returns {Promise<{ prefix, coVideo, coHls, trangThaiXuLy, message }>}
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

  // 0) Đã có video / đang xử lý -> chặn upload.
  const trangThai = await trangThaiUploadTheoBaiGiang(idBaiGiang, duongDan);
  if (!trangThai.canUpload) {
    const err = new Error(trangThai.message);
    err.status = 409; // Conflict: bài giảng đã có video hoặc đang xử lý
    err.trangThai = trangThai.status;
    throw err;
  }

  // 1) Upload lại sau khi thất bại: dọn chunk dở dang của lượt trước để worker
  //    không trộn segment cũ với segment mới.
  if (trangThai.status === 'failed') {
    await xoaObjectTheoPrefix(duongDan.chunk);
  }

  // 2) Upload video gốc vào stream/... -> lưu object key
  const ext = (path.extname(file.originalname || '') || '.mp4').toLowerCase();
  const keyBaiGiang = await uploadFile(`${duongDan.stream}/video${ext}`, file.path);

  // 3) Giữ file gốc lại cho worker. Multer xóa file tạm ngay khi response xong nên
  //    không chuyển sang spool thì worker phải tải lại từ MinIO. Hỏng bước này cũng
  //    không sao - worker có đường lùi là tải từ MinIO.
  try {
    spool.luuVaoSpool(idBaiGiang, file.path, ext);
  } catch (e) {
    console.warn(`Không lưu được video vào spool (bài giảng ${idBaiGiang}):`, e.message);
  }

  // 4) Vào hàng đợi. Reset sạch dấu vết lượt xử lý trước (lỗi, số lần thử, mốc backoff)
  //    để job mới bắt đầu từ đầu.
  await BaiGiang.update(
    {
      LinkBaiGiang: keyBaiGiang,
      LinkChunkBaiGiang: null,
      TrangThaiXuLyChunk: TT.DANG_CHO,
      DanhSachChunk: null,
      ThoiLuongGiay: null,
      NgayBatDauXuLy: null,
      NgayHoanThanhXuLy: null,
      LoiXuLy: null,
      SoLanThuLai: 0,
      NgayThuLaiSauKhi: null,
      MaJobXuLy: null,
    },
    { where: { Id: idBaiGiang } }
  );

  // Không trả URL MinIO; chỉ báo trạng thái. Phát video qua proxy có token.
  return {
    prefix: duongDan.duoi,
    coVideo: true,
    coHls: false, // chunk chưa có -> client hiển thị "đang xử lý" cho tới khi worker xong
    trangThaiXuLy: TT.DANG_CHO,
    message: 'Upload thành công, video đang chờ xử lý',
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
        attributes: ['Id', 'TenBaiGiang', 'LinkBaiGiang', 'LinkChunkBaiGiang', 'TrangThaiXuLyChunk'],
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
    // Cho UI phân biệt "đang chờ cắt chunk" với "đã thất bại" - hai trường hợp này
    // đều là coVideo=true, coHls=false nên không suy ra được từ 2 cờ trên.
    trangThaiXuLy: ct.BaiGiang?.TrangThaiXuLyChunk ?? null,
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
    attributes: [
      'Id', 'TenBaiGiang', 'NoiDungBaiGiang', 'LinkBaiGiang', 'LinkChunkBaiGiang', 'LuotXem',
      'TrangThaiXuLyChunk', 'ThoiLuongGiay',
    ],
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
    trangThaiXuLy: bg.TrangThaiXuLyChunk ?? null,
    thoiLuongGiay: bg.ThoiLuongGiay ?? null,
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
    attributes: [
      'Id', 'TenBaiGiang', 'NoiDungBaiGiang', 'LinkBaiGiang', 'LinkChunkBaiGiang', 'LuotXem',
      'TrangThaiXuLyChunk', 'ThoiLuongGiay', 'LoiXuLy',
    ],
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
    trangThaiXuLy: bg.TrangThaiXuLyChunk ?? null,
    thoiLuongGiay: bg.ThoiLuongGiay ?? null,
    // Chỉ lộ thông báo lỗi khi thật sự đã thất bại, tránh trả lỗi cũ của lượt retry
    // trước trong lúc job vẫn đang chạy lại.
    loiXuLy: bg.TrangThaiXuLyChunk === TT.THAT_BAI ? bg.LoiXuLy ?? null : null,
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

  // Cho xóa khi đã xử lý xong ('completed') hoặc đã thất bại hẳn ('failed' - job hết
  // lượt retry, giảng viên cần dọn để upload lại). Chặn khi đang chờ/đang chạy: worker
  // vẫn đang ghi vào chunk/, xóa lúc này sẽ để lại rác và job kết thúc trên dữ liệu đã mất.
  const trangThai = await trangThaiUploadTheoBaiGiang(idBaiGiang, duongDan);
  if (trangThai.status !== 'completed' && trangThai.status !== 'failed') {
    const err = new Error(
      trangThai.status === 'processing'
        ? 'Video đang xử lý, không thể xóa'
        : 'Bài giảng chưa có video, không thể xóa'
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

  // Bỏ luôn file gốc còn nằm trong spool (nếu job chưa kịp chạy/đã hỏng) để khỏi
  // chiếm ổ đĩa worker vô ích.
  try {
    spool.xoaFileSpool(idBaiGiang);
  } catch (_) {
    /* dọn rác hụt không ảnh hưởng kết quả xóa */
  }

  // Xóa liên kết video/chunk và đưa trạng thái xử lý về vạch xuất phát để bài giảng
  // này upload lại được.
  await BaiGiang.update(
    {
      LinkBaiGiang: null,
      LinkChunkBaiGiang: null,
      TrangThaiXuLyChunk: TT.CHUA_XU_LY,
      DanhSachChunk: null,
      ThoiLuongGiay: null,
      NgayBatDauXuLy: null,
      NgayHoanThanhXuLy: null,
      LoiXuLy: null,
      SoLanThuLai: 0,
      NgayThuLaiSauKhi: null,
      MaJobXuLy: null,
    },
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
  // Dùng bởi worker cắt chunk (xuLyChunk.service.js). Chỉ một chiều: service này
  // KHÔNG require worker - đưa job vào hàng đợi chỉ là một câu UPDATE trạng thái.
  duongDanBaiGiang,
  uploadFile,
  listObjectNames,
  xoaObjectTheoPrefix,
};
