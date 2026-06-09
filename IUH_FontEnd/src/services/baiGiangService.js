import http from '../api/http'
import { ENDPOINTS, UPLOAD_API_KEY } from '../constants'

// Chi tiết đăng ký bài giảng (các chương) theo phiên bản môn học.
export const getChiTiet = async (monHocVersionId) => {
  const { data } = await http.get(ENDPOINTS.baiGiang.chiTiet, {
    params: { monHocVersionId },
  })
  return data.chiTiet || []
}

// Danh sách video bài giảng theo mã môn + phiên bản (trang xem bài giảng).
export const getDanhSachVideo = async (maMon, version) => {
  const { data } = await http.get(ENDPOINTS.baiGiang.danhSach, {
    params: { maMon, version },
  })
  return data.videos || []
}

// Đảm bảo chương đã có bản ghi bài giảng; trả về baiGiangId (tạo nếu chưa có).
export const ensureBaiGiang = async (chiTietId) => {
  const { data } = await http.post(ENDPOINTS.baiGiang.ensure(chiTietId))
  return data.baiGiangId
}

// Tải video lên cho một bài giảng. Trả về { message, coVideo, coHls, ... }.
export const uploadVideo = async (baiGiangId, file) => {
  const form = new FormData()
  form.append('video', file)
  const { data } = await http.post(
    ENDPOINTS.baiGiang.uploadVideo(baiGiangId),
    form,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        'x-api-key': UPLOAD_API_KEY,
      },
    }
  )
  return data
}

// Lấy URL phát HLS (kèm token) qua proxy backend cho bucket private.
export const getPlaybackToken = async (baiGiangId) => {
  const { data } = await http.get(ENDPOINTS.baiGiang.playbackToken(baiGiangId))
  return data.url
}
