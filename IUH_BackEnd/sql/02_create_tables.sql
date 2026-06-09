-- Học phần - Môn học
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tb_HocPhanMonHoc')
BEGIN
    CREATE TABLE tb_HocPhanMonHoc (
        id BIGINT PRIMARY KEY IDENTITY(1,1),
        MaHocPhan NVARCHAR(20) NOT NULL,
        MaMon NVARCHAR(20) NOT NULL
    );
END
GO

-- Sinh viên - Học phần
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tb_SinhVienHocPhan')
BEGIN
    CREATE TABLE tb_SinhVienHocPhan (
        id BIGINT PRIMARY KEY IDENTITY(1,1),
        MaSinhVien NVARCHAR(20) NOT NULL,
        MaHocPhan NVARCHAR(20) NOT NULL
    );
END
GO
