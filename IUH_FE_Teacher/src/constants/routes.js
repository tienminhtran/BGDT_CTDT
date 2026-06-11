// Đường dẫn (path) của các trang trong app giảng viên.
export const ROUTES = {
  home: '/', // Trang quản lý bài giảng
  // Token mờ (AES) do backend cấp, không lộ mã môn/phiên bản -> 1 tham số :token
  coursePlayer: '/bai-giang-dien-tu/:token',
  // Xem 1 video riêng lẻ theo id bài giảng (tb_BaiGiang)
  videoTheoId: '/video/:id',
}

// Đường dẫn xem 1 video theo id bài giảng.
export const buildVideoTheoIdPath = (id) => `/video/${id}`

// Tạo đường dẫn xem bài giảng từ token mờ (lấy qua API /lectures/token).
export const buildCoursePlayerPath = (courseToken) =>
  `/bai-giang-dien-tu/${courseToken}`
