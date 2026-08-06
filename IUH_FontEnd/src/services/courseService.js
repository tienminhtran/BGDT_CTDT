import http from '../api/http'
import { ENDPOINTS } from '../constants'

// Danh sách môn học (khóa học LMS) mà sinh viên đang tham gia.
export const getMyCourses = async () => {
  const { data } = await http.get(ENDPOINTS.courses, { showErrorPage: true })
  return data.courses || []
}
