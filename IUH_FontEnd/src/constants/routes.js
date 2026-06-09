// Đường dẫn (path) của các trang trong ứng dụng.
// Dùng chung cho <Route>, <Navigate>, <Link> để không gõ chuỗi tay.
export const ROUTES = {
  home: '/',
  dashboard: '/trang-chu',
  quanLyBaiGiang: '/quan-ly-bai-giang',
  coursePlayer: '/bai-giang-dien-tu/:maMon/:version',
  coursePlayerNoVersion: '/bai-giang-dien-tu/:maMon',
}

// Tạo đường dẫn vào học từ "maMon/version" (hoặc chỉ "maMon").
export const buildCoursePlayerPath = (slug) => `/bai-giang-dien-tu/${slug}`
