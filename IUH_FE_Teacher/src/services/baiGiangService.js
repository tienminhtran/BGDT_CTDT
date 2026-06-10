import http from '../api/http'
import { ENDPOINTS, UPLOAD_API_KEY } from '../constants'

// Chi tiết đăng ký bài giảng (các chương) theo phiên bản môn học.
export const getChiTiet = async (subjectVersionId) => {
  const { data } = await http.get(ENDPOINTS.lectures.chapters, {
    params: { subjectVersionId },
  })
  return data.chiTiet || []
}

// Sinh token mờ cho 1 khóa học (mã môn + phiên bản) để điều hướng không lộ mã môn.
export const createCourseToken = async (courseCode, version) => {
  const { data } = await http.post(ENDPOINTS.lectures.token, { courseCode, version })
  return data.token
}

// Danh sách video bài giảng theo token mờ. Trả về { subjectName, version, videos }.
export const getDanhSachVideo = async (courseToken) => {
  const { data } = await http.get(ENDPOINTS.lectures.list, {
    params: { course: courseToken },
  })
  return { subjectName: data.subjectName, version: data.version, videos: data.videos || [] }
}

// Đảm bảo chương đã có bản ghi bài giảng; trả về baiGiangId (tạo nếu chưa có).
export const ensureBaiGiang = async (chapterId) => {
  const { data } = await http.post(ENDPOINTS.lectures.ensureChapter(chapterId))
  return data.baiGiangId
}

// Tải video lên cho một bài giảng. Trả về { message, coVideo, coHls, ... }.
export const uploadVideo = async (lectureId, file) => {
  const form = new FormData()
  form.append('video', file)
  const { data } = await http.post(ENDPOINTS.lectures.video(lectureId), form, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'x-api-key': UPLOAD_API_KEY,
    },
  })
  return data
}

// Lấy URL phát HLS (kèm token) qua proxy backend cho bucket private.
export const getPlaybackToken = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.lectures.playbackToken(lectureId))
  return data.url
}
