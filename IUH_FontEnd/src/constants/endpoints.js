// Tập trung toàn bộ đường dẫn API của backend (đặt tên tiếng Anh).
// Endpoint động (có id) là hàm trả về chuỗi để service gọi cho gọn.
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    me: '/auth/me',
  },
  courses: '/courses',
  subjects: '/subjects',
  lectures: {
    list: '/lectures', // ?course=<token>
    token: '/lectures/token', // POST { courseCode, version } -> { token }
    chapters: '/lectures/chapters', // ?subjectVersionId=<id>
    ensureChapter: (chapterId) => `/lectures/chapters/${chapterId}/ensure`,
    video: (lectureId) => `/lectures/${lectureId}/video`,
    playbackToken: (lectureId) => `/lectures/${lectureId}/playback-token`,
  },
  studentCourses: {
    import: '/student-courses/import',
    access: '/student-courses/access', // ?course=<token>
  },
  reviews: {
    byLecture: (lectureId) => `/reviews/${lectureId}`,
    mine: (lectureId) => `/reviews/${lectureId}/mine`,
  },
}
