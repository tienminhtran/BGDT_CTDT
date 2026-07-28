/*
  Thêm các cột theo dõi tiến trình xử lý (chunk hóa) video bài giảng.

  Luồng mới: API upload chỉ đẩy video gốc lên MinIO rồi đánh dấu 'DangCho' và
  trả response ngay. Worker nền (src/services/xuLyChunk.service.js) poll bảng này,
  claim job nguyên tử, chạy ffmpeg cắt HLS rồi ghi kết quả ngược lại.

  TrangThaiXuLyChunk: ChuaXuLy | DangCho | DangXuLy | HoanThanh | ThatBai
  DanhSachChunk:      JSON array các segment (tên, thứ tự, thời lượng)
  NgayThuLaiSauKhi:   mốc sớm nhất được bốc lại sau khi lỗi (backoff tăng dần)
  MaJobXuLy:          id lượt chạy của worker, để đối chiếu log khi debug

  Câu lệnh idempotent: mỗi cột chỉ thêm khi chưa tồn tại nên chạy lại nhiều
  lần vẫn an toàn.
*/

-- Bản nháp trước đây đặt tên cột là BullMQJobId (dự định dùng Redis/BullMQ).
-- Chốt lại dùng DB làm hàng đợi -> đổi tên cho đúng nghĩa, giữ nguyên dữ liệu.
IF COL_LENGTH('tb_BaiGiang', 'BullMQJobId') IS NOT NULL
   AND COL_LENGTH('tb_BaiGiang', 'MaJobXuLy') IS NULL
BEGIN
    EXEC sp_rename 'tb_BaiGiang.BullMQJobId', 'MaJobXuLy', 'COLUMN';
END
GO

IF COL_LENGTH('tb_BaiGiang', 'TrangThaiXuLyChunk') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD TrangThaiXuLyChunk NVARCHAR(20) NOT NULL
        CONSTRAINT DF_tb_BaiGiang_TrangThaiXuLyChunk DEFAULT 'ChuaXuLy';
END
GO

IF COL_LENGTH('tb_BaiGiang', 'DanhSachChunk') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD DanhSachChunk NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('tb_BaiGiang', 'ThoiLuongGiay') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD ThoiLuongGiay FLOAT NULL;
END
GO

IF COL_LENGTH('tb_BaiGiang', 'NgayBatDauXuLy') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD NgayBatDauXuLy DATETIME2 NULL;
END
GO

IF COL_LENGTH('tb_BaiGiang', 'NgayHoanThanhXuLy') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD NgayHoanThanhXuLy DATETIME2 NULL;
END
GO

IF COL_LENGTH('tb_BaiGiang', 'LoiXuLy') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD LoiXuLy NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('tb_BaiGiang', 'SoLanThuLai') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD SoLanThuLai INT NOT NULL
        CONSTRAINT DF_tb_BaiGiang_SoLanThuLai DEFAULT 0;
END
GO

-- Mốc thời gian sớm nhất được bốc lại sau khi job lỗi. Thiếu cột này thì worker
-- polling sẽ nhặt lại job hỏng ngay lượt kế tiếp -> backoff không có tác dụng.
IF COL_LENGTH('tb_BaiGiang', 'NgayThuLaiSauKhi') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD NgayThuLaiSauKhi DATETIME2 NULL;
END
GO

IF COL_LENGTH('tb_BaiGiang', 'MaJobXuLy') IS NULL
BEGIN
    ALTER TABLE tb_BaiGiang ADD MaJobXuLy NVARCHAR(100) NULL;
END
GO

-- Ràng buộc giá trị hợp lệ cho trạng thái (khớp enum TRANG_THAI_XU_LY_CHUNK ở backend)
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tb_BaiGiang_TrangThaiXuLyChunk')
BEGIN
    ALTER TABLE tb_BaiGiang ADD CONSTRAINT CK_tb_BaiGiang_TrangThaiXuLyChunk
        CHECK (TrangThaiXuLyChunk IN ('ChuaXuLy', 'DangCho', 'DangXuLy', 'HoanThanh', 'ThatBai'));
END
GO

/*
  Backfill dữ liệu cũ: các bài giảng đã upload bằng luồng đồng bộ trước đây đang
  mang giá trị mặc định 'ChuaXuLy'. Bài nào đã có đủ video gốc + playlist HLS thì
  thực chất đã xong -> đánh 'HoanThanh', nếu không luồng kiểm tra trạng thái sẽ
  hiểu nhầm là chưa có video và cho upload đè.

  Bài chỉ có video gốc mà thiếu chunk vẫn để 'ChuaXuLy': backend tự đối chiếu
  MinIO cho nhóm này (xem trangThaiUploadTheoDuongDan) thay vì đoán mò ở đây.
*/
UPDATE tb_BaiGiang
SET TrangThaiXuLyChunk = 'HoanThanh',
    NgayHoanThanhXuLy = ISNULL(NgayHoanThanhXuLy, SYSUTCDATETIME())
WHERE TrangThaiXuLyChunk = 'ChuaXuLy'
  AND LinkBaiGiang IS NOT NULL
  AND LinkChunkBaiGiang IS NOT NULL;
GO

/*
  Worker claim job theo (TrangThaiXuLyChunk, NgayThuLaiSauKhi) và quét job treo
  theo NgayBatDauXuLy -> đánh index phục vụ đúng hai truy vấn đó.

  Cố tình KHÔNG dùng filtered index: filtered index bắt buộc mọi kết nối ghi vào
  bảng phải đúng SET options (ANSI_NULLS/QUOTED_IDENTIFIER ON), sai là INSERT/UPDATE
  hỏng cả bảng. Bảng bài giảng nhỏ nên index thường là đủ và không có rủi ro đó.

  Drop rồi tạo lại để lần chạy sau vẫn nhận được định nghĩa mới nhất.
*/
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tb_BaiGiang_TrangThaiXuLyChunk'
                                       AND object_id = OBJECT_ID('tb_BaiGiang'))
BEGIN
    DROP INDEX IX_tb_BaiGiang_TrangThaiXuLyChunk ON tb_BaiGiang;
END
GO

CREATE INDEX IX_tb_BaiGiang_TrangThaiXuLyChunk
    ON tb_BaiGiang (TrangThaiXuLyChunk, NgayThuLaiSauKhi)
    INCLUDE (MaJobXuLy, NgayBatDauXuLy, SoLanThuLai);
GO
