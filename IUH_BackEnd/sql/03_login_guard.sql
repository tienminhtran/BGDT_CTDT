-- Chống dò mật khẩu đăng nhập (brute-force) cho POST /api/auth/login.
-- 1 bảng duy nhất, phân biệt loại bản ghi bằng cột Scope:
--   'user_ip' : số lần sai của (username|ip)  -> tới ngưỡng thì bắt nhập captcha
--   'user'    : số lần sai của username        -> tới ngưỡng thì khóa tài khoản
--   'ip'      : số lần sai của IP              -> theo dõi quét diện rộng
--   'lock'    : tài khoản đang bị khóa, ExpiresAt = thời điểm mở khóa
--   'captcha' : jti của captcha ĐÃ dùng        -> chặn dùng lại 1 mã captcha nhiều lần
-- ExpiresAt luôn là thời điểm hết hạn (UTC) của bản ghi -> hết hạn thì coi như không tồn tại.

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tb_LoginAttempt')
BEGIN
    CREATE TABLE tb_LoginAttempt (
        Id        BIGINT       PRIMARY KEY IDENTITY(1,1),
        Scope     VARCHAR(16)  NOT NULL,
        ScopeKey  VARCHAR(200) NOT NULL,
        FailCount INT          NOT NULL CONSTRAINT DF_tb_LoginAttempt_FailCount DEFAULT 0,
        ExpiresAt DATETIME2(0) NOT NULL,
        UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_tb_LoginAttempt_UpdatedAt DEFAULT SYSUTCDATETIME()
    );

    -- Bắt buộc: MERGE upsert và cơ chế "captcha dùng 1 lần" dựa vào ràng buộc unique này.
    CREATE UNIQUE INDEX UX_tb_LoginAttempt_Scope_Key
        ON tb_LoginAttempt (Scope, ScopeKey);

    -- Phục vụ job dọn bản ghi hết hạn (chạy mỗi 10 phút trong server.js).
    CREATE INDEX IX_tb_LoginAttempt_ExpiresAt
        ON tb_LoginAttempt (ExpiresAt);
END
GO
