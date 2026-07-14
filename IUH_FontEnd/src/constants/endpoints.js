// Tập trung toàn bộ đường dẫn API của backend (đặt tên tiếng Anh).
// Endpoint động (có id) là hàm trả về chuỗi để service gọi cho gọn.
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
    logout: '/auth/logout',
    captcha: '/auth/captcha', // -> { captchaToken, image (base64), expiresIn }
    loginStatus: '/auth/login-status', // ?username=... -> { locked, retryAfter, captchaRequired }
  },
  courses: '/courses',
  subjects: '/subjects',
  lectures: {
    list: '/lectures', // ?course=<token>
    token: '/lectures/token', // POST { courseCode, version } -> { token }
    playbackToken: (lectureId) => `/lectures/${lectureId}/playback-token`,
  },
  studentCourses: {
    import: '/student-courses/import',
    access: '/student-courses/access', // ?course=<token>
  },
  reviews: {
    byLecture: (lectureId) => `/reviews/${lectureId}`,
    mine: (lectureId) => `/reviews/${lectureId}/mine`,
    my: () => '/reviews/my', // tất cả đánh giá của SV đang đăng nhập
  },
}
