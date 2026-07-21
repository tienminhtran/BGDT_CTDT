/*
  Đổi cấu trúc đường dẫn video bài giảng trên MinIO.

  Cũ:  [ma_tuquan]/[version]/[idChiTiet]/stream/video.mp4
       [ma_tuquan]/[version]/[idChiTiet]/chunk/index.m3u8
  Mới: stream/[ma_tuquan]/[version]/[idChiTiet]/video.mp4
       chunk/[ma_tuquan]/[version]/[idChiTiet]/index.m3u8

  Chỉ đảo vị trí đoạn 'stream'/'chunk' lên đầu -> độ dài chuỗi không đổi,
  LinkBaiGiang VARCHAR(500) không bị tràn.

  CHẠY SAU KHI đã di chuyển object trên MinIO (scripts/migrate-cau-truc-minio.js).
  Câu lệnh idempotent: key đã đổi rồi bắt đầu bằng 'stream/'/'chunk/' (không có '/'
  đứng trước) nên không khớp mẫu '%/stream/%' và sẽ bị bỏ qua ở lần chạy sau.
*/

-- 1) Xem trước những dòng sẽ đổi (chạy trước để đối chiếu)
SELECT
    Id,
    LinkBaiGiang       AS LinkBaiGiang_Cu,
    LinkChunkBaiGiang  AS LinkChunkBaiGiang_Cu,
    CASE WHEN LinkBaiGiang LIKE '%/stream/%'
         THEN 'stream/'
              + LEFT(LinkBaiGiang, CHARINDEX('/stream/', LinkBaiGiang) - 1)
              + SUBSTRING(LinkBaiGiang, CHARINDEX('/stream/', LinkBaiGiang) + 7, LEN(LinkBaiGiang))
    END AS LinkBaiGiang_Moi,
    CASE WHEN LinkChunkBaiGiang LIKE '%/chunk/%'
         THEN 'chunk/'
              + LEFT(LinkChunkBaiGiang, CHARINDEX('/chunk/', LinkChunkBaiGiang) - 1)
              + SUBSTRING(LinkChunkBaiGiang, CHARINDEX('/chunk/', LinkChunkBaiGiang) + 6, LEN(LinkChunkBaiGiang))
    END AS LinkChunkBaiGiang_Moi
FROM tb_BaiGiang
WHERE LinkBaiGiang LIKE '%/stream/%'
   OR LinkChunkBaiGiang LIKE '%/chunk/%';
GO

-- 2) Cập nhật thật (bọc transaction để rollback được nếu số dòng bất thường)
BEGIN TRANSACTION;

UPDATE tb_BaiGiang
SET LinkBaiGiang = 'stream/'
                 + LEFT(LinkBaiGiang, CHARINDEX('/stream/', LinkBaiGiang) - 1)
                 + SUBSTRING(LinkBaiGiang, CHARINDEX('/stream/', LinkBaiGiang) + 7, LEN(LinkBaiGiang))
WHERE LinkBaiGiang LIKE '%/stream/%';

UPDATE tb_BaiGiang
SET LinkChunkBaiGiang = 'chunk/'
                      + LEFT(LinkChunkBaiGiang, CHARINDEX('/chunk/', LinkChunkBaiGiang) - 1)
                      + SUBSTRING(LinkChunkBaiGiang, CHARINDEX('/chunk/', LinkChunkBaiGiang) + 6, LEN(LinkChunkBaiGiang))
WHERE LinkChunkBaiGiang LIKE '%/chunk/%';

-- Đối chiếu kết quả trước khi chốt
SELECT Id, LinkBaiGiang, LinkChunkBaiGiang
FROM tb_BaiGiang
WHERE LinkBaiGiang IS NOT NULL OR LinkChunkBaiGiang IS NOT NULL;

COMMIT TRANSACTION;   -- đổi thành ROLLBACK TRANSACTION nếu kết quả không như ý
GO
