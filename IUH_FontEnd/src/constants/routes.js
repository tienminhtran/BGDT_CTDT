// Đường dẫn (path) của các trang trong ứng dụng.
// Dùng chung cho <Route>, <Navigate>, <Link> để không gõ chuỗi tay.
export const ROUTES = {
  home: '/',
  dashboard: '/trang-chu',
  quanLyBaiGiang: '/quan-ly-bai-giang',
  // Token mờ (AES) do backend cấp, không lộ mã môn/phiên bản -> 1 tham số :token
  coursePlayer: '/bai-giang-dien-tu/:token',
}

// Tạo đường dẫn vào học từ token mờ (lấy qua API /lectures/token).
export const buildCoursePlayerPath = (courseToken) =>
  `/bai-giang-dien-tu/${courseToken}`
