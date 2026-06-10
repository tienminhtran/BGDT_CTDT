// Đường dẫn (path) của các trang trong app giảng viên.
export const ROUTES = {
  home: '/', // Trang quản lý bài giảng
  // Token mờ (AES) do backend cấp, không lộ mã môn/phiên bản -> 1 tham số :token
  coursePlayer: '/bai-giang-dien-tu/:token',
}

// Tạo đường dẫn xem bài giảng từ token mờ (lấy qua API /lectures/token).
export const buildCoursePlayerPath = (courseToken) =>
  `/bai-giang-dien-tu/${courseToken}`
