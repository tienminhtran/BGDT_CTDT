// Tập trung toàn bộ đường dẫn API của backend.
// Endpoint động (có id) là hàm trả về chuỗi để service gọi cho gọn.
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },
  courses: '/courses',
  monHoc: '/monhoc',
  baiGiang: {
    chiTiet: '/baigiang/chi-tiet',
    danhSach: '/baigiang/danh-sach',
    ensure: (chiTietId) => `/baigiang/chi-tiet/${chiTietId}/ensure`,
    uploadVideo: (baiGiangId) => `/baigiang/${baiGiangId}/upload-video`,
    playbackToken: (baiGiangId) => `/baigiang/${baiGiangId}/playback-token`,
  },
  sinhVienHocPhan: {
    import: '/sinhvien-hocphan/import',
    kiemTra: (maMon) => `/sinhvien-hocphan/kiem-tra/${encodeURIComponent(maMon)}`,
  },
}
