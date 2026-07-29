/*
  Tài khoản đăng nhập app giảng viên (BGĐT).

  Trước đây app giảng viên không có đăng nhập thật: mọi request gắn chung một key
  tĩnh KEY_LOGIN_TEACHER. Bảng này cho phép cấp tài khoản riêng cho từng nhân sự,
  khóa/xóa được từng người mà không phải đổi key dùng chung.

  Cột:
    Manhansu  - mã nhân sự, đồng thời là tên đăng nhập (khóa chính)
    hoten     - họ tên hiển thị
    matkhau   - CHUỖI BĂM bcrypt, KHÔNG BAO GIỜ lưu mật khẩu thô.
                Độ dài cố định 60 ký tự, để NVARCHAR(255) cho thoáng nếu sau này
                đổi thuật toán/cost.
    trangthai - 'HoatDong' | 'Khoa'. Tài khoản 'Khoa' không đăng nhập được nhưng
                vẫn giữ lại dữ liệu (khác với xóa hẳn).

  Câu lệnh idempotent: chạy lại nhiều lần không lỗi, không ghi đè tài khoản đã có.
*/

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tb_login_bgdt')
BEGIN
    CREATE TABLE tb_login_bgdt (
        Manhansu  NVARCHAR(50)  NOT NULL PRIMARY KEY,
        hoten     NVARCHAR(255) NOT NULL,
        matkhau   NVARCHAR(255) NOT NULL,
        trangthai NVARCHAR(20)  NOT NULL
            CONSTRAINT DF_tb_login_bgdt_trangthai DEFAULT 'HoatDong'
    );
END
GO

-- Chốt bộ giá trị hợp lệ của trạng thái (khớp hằng TRANG_THAI_TAI_KHOAN ở backend)
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_tb_login_bgdt_trangthai')
BEGIN
    ALTER TABLE tb_login_bgdt ADD CONSTRAINT CK_tb_login_bgdt_trangthai
        CHECK (trangthai IN ('HoatDong', 'Khoa'));
END
GO

/*
  Tài khoản khởi tạo:
     Mã nhân sự : 04112003
     Họ tên     : Trần Minh Tiến
     Mật khẩu   : 04112003   (đã băm bcrypt cost 10 ở chuỗi bên dưới)

  Chuỗi băm sinh sẵn bằng bcryptjs - cùng thư viện backend dùng để so khớp khi
  đăng nhập, nên không cần chạy script phụ nào.

  ĐỔI MẬT KHẨU NÀY NGAY SAU LẦN ĐĂNG NHẬP ĐẦU: mật khẩu trùng mã nhân sự và chuỗi
  băm nằm công khai trong mã nguồn nên ai đọc được repo là đăng nhập được.
*/
IF NOT EXISTS (SELECT 1 FROM tb_login_bgdt WHERE Manhansu = N'04112003')
BEGIN
    INSERT INTO tb_login_bgdt (Manhansu, hoten, matkhau, trangthai)
    VALUES (
        N'04112003',
        N'Trần Minh Tiến',
        N'$2b$10$LFfjJ1C3DyiHSBcCInRN0OAsv1KhwEb5ouR0hQ2n4RPfPPU7ILmo.',
        N'HoatDong'
    );
END
GO

-- Đối chiếu sau khi chạy
SELECT Manhansu, hoten, trangthai, LEN(matkhau) AS DoDaiChuoiBam FROM tb_login_bgdt;
GO
