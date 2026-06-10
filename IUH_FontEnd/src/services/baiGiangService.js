import http from '../api/http'
import { ENDPOINTS } from '../constants'

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

// Lấy URL phát HLS (kèm token) qua proxy backend cho bucket private.
export const getPlaybackToken = async (lectureId) => {
  const { data } = await http.get(ENDPOINTS.lectures.playbackToken(lectureId))
  return data.url
}
