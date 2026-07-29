// Tập trung toàn bộ đường dẫn API của backend (đặt tên tiếng Anh).
// Endpoint động (có id) là hàm trả về chuỗi để service gọi cho gọn.
export const ENDPOINTS = {
  // Tài khoản đăng nhập app giảng viên (bảng tb_login_bgdt)
  users: {
    login: '/users/login', // POST { manhansu, matkhau } -> { token, nguoiDung }
    me: '/users/me', // GET (Bearer) -> phiên hiện tại, dùng để kiểm token còn hạn
    list: '/users', // GET (Bearer) -> danh sách tài khoản
    create: '/users', // POST (Bearer) { manhansu, hoten, matkhau }
    remove: (manhansu) => `/users/${encodeURIComponent(manhansu)}`, // DELETE
    // PATCH { trangthai: 'HoatDong' | 'Khoa' }
    trangThai: (manhansu) => `/users/${encodeURIComponent(manhansu)}/trang-thai`,
    // PATCH { matkhau } -> quản trị viên cấp lại mật khẩu (không cần mật khẩu cũ)
    matKhau: (manhansu) => `/users/${encodeURIComponent(manhansu)}/mat-khau`,
  },
  subjects: '/subjects',
  lectures: {
    list: '/lectures', // ?course=<token>
    token: '/lectures/token', // POST { courseCode, version } -> { token }
    chapters: '/lectures/chapters', // ?subjectVersionId=<id>
    ensureChapter: (chapterId) => `/lectures/chapters/${chapterId}/ensure`,
    video: (lectureId) => `/lectures/${lectureId}/video`,
    playbackToken: (lectureId) => `/lectures/${lectureId}/playback-token`,
    teacher: (lectureId) => `/lectures/${lectureId}/teacher`, // xem 1 video theo id (giảng viên)
  },
  lectureHistory: {
    list: '/lecture-history', // GET ?limit= -> toàn bộ nhật ký (kèm môn/bài giảng)
    byLecture: (lectureId) => `/lecture-history/${lectureId}`, // GET nhật ký 1 bài giảng
  },
  reviews: {
    overview: '/reviews/overview', // GET -> thống kê theo phiên bản môn (giảng viên)
    // GET -> bình luận của 1 phiên bản môn (để xuất Excel)
    comments: (versionId) => `/reviews/overview/${versionId}/comments`,
    byLecture: (lectureId) => `/reviews/${lectureId}`,
  },
  courseSubjects: {
    list: '/course-subjects', // GET -> ánh xạ đã import, kèm tên môn
    import: '/course-subjects/import', // POST { rows: [{ MaMon, MaHocPhan }] }
    remove: (id) => `/course-subjects/${id}`, // DELETE
  },
  storage: {
    list: '/storage', // GET ?prefix=... -> nội dung 1 cấp thư mục MinIO
    summary: '/storage/summary', // GET ?prefix=... -> tổng file + dung lượng
  },
  students: {
    list: '/student-courses', // GET -> danh sách SV + trạng thái khóa đăng nhập
    remove: (mssv) => `/student-courses/${mssv}`, // DELETE
    unlock: (mssv) => `/student-courses/${mssv}/unlock`, // POST
  },
}
