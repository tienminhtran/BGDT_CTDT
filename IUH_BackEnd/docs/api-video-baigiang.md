# API Video Bài giảng

Tài liệu 3 API thao tác video theo **id bài giảng** (`tb_BaiGiang.Id`):

1. [Upload video](#1-upload-video)
2. [Xem 1 video theo id bài giảng](#2-xem-1-video-theo-id-bài-giảng)
3. [Xóa video](#3-xóa-video)

**Base URL:** `/api/lectures`

## Xác thực (Headers)

| Header          | Giá trị                | Dùng cho                        |
| --------------- | ---------------------- | ------------------------------- |
| `x-api-key`     | `UPLOAD_API_KEY`       | Upload, Xóa (bảo vệ endpoint)   |
| `x-teacher-key` | `KEY_LOGIN_TEACHER`    | Xem (giảng viên), Xóa           |

> Cả hai key được cấu hình bằng biến môi trường trên server. Thiếu/sai key → `401`
> (riêng thiếu cấu hình `UPLOAD_API_KEY` trên server → `500`).

---

## 1. Upload video

Upload 1 file video cho bài giảng. File gốc được lưu vào `stream/` trên MinIO, đồng thời
transcode sang HLS (`chunk/index.m3u8` + các `.ts`) nếu server có `ffmpeg`.

```
POST /api/lectures/:id/video
```

**Headers**

| Header         | Bắt buộc | Ghi chú                          |
| -------------- | :------: | -------------------------------- |
| `x-api-key`    |    ✅    | `UPLOAD_API_KEY`                 |
| `Content-Type` |    ✅    | `multipart/form-data` (tự set)   |

**Path params**

| Tham số | Kiểu | Mô tả                       |
| ------- | ---- | --------------------------- |
| `id`    | int  | Id bài giảng (`tb_BaiGiang`) |

**Body (form-data)**

| Field   | Kiểu | Ghi chú                                              |
| ------- | ---- | --------------------------------------------------- |
| `video` | file | Chỉ nhận `video/*`. Tối đa `MAX_VIDEO_MB` (mặc định **2048 MB**). |

**Ràng buộc trạng thái:** chỉ upload được khi bài giảng **chưa có video** (`status = empty`).
Nếu đang xử lý hoặc đã có video → `409`. (Có thể kiểm tra trước bằng
`GET /api/lectures/:id/upload-status`.)

**Response `200`**

```json
{
  "idBaiGiang": 12,
  "prefix": "2101420/1/34",
  "coVideo": true,
  "coHls": true,
  "hlsSkipped": false,
  "message": "Upload thành công"
}
```

| Trường       | Kiểu    | Mô tả                                                       |
| ------------ | ------- | ---------------------------------------------------------- |
| `idBaiGiang` | int     | Id bài giảng đã upload                                      |
| `prefix`     | string  | Đường dẫn thư mục lưu trên MinIO `[ma_tuquan]/[version]/[idChiTiet]` |
| `coVideo`    | boolean | Đã lưu video gốc (`stream/`) hay chưa                       |
| `coHls`      | boolean | Đã tạo HLS chunk hay chưa                                   |
| `hlsSkipped` | boolean | `true` nếu bỏ qua tạo HLS vì server không có `ffmpeg`       |
| `message`    | string  | Thông báo kết quả                                          |

**Lỗi**

| Mã    | Trường hợp                                             |
| ----- | ----------------------------------------------------- |
| `400` | Id không hợp lệ / thiếu file / file không phải video   |
| `401` | Sai `x-api-key`                                        |
| `409` | Bài giảng đã có video hoặc video đang xử lý            |
| `500` | Chưa cấu hình `UPLOAD_API_KEY`                         |

**Ví dụ cURL**

```bash
curl -X POST "http://localhost:5999/api/lectures/12/video" \
  -H "x-api-key: <UPLOAD_API_KEY>" \
  -F "video=@baigiang01.mp4"
```

---

## 2. Xem 1 video theo id bài giảng

Giảng viên xem 1 video riêng lẻ **chỉ bằng id** (không cần token khóa học). Trả metadata
bài giảng + URL phát HLS trong 1 lần gọi.

```
GET /api/lectures/:id/teacher
```

**Headers**

| Header          | Bắt buộc | Ghi chú             |
| --------------- | :------: | ------------------- |
| `x-teacher-key` |    ✅    | `KEY_LOGIN_TEACHER` |

**Path params**

| Tham số | Kiểu | Mô tả        |
| ------- | ---- | ------------ |
| `id`    | int  | Id bài giảng |

**Response `200`**

```json
{
  "baiGiangId": 12,
  "chiTietId": 34,
  "tenBaiGiang": "Chương 1: Tổng quan",
  "noiDungChuong": "Giới thiệu môn học",
  "noiDungBaiGiang": "...",
  "subjectName": "Lập trình Web",
  "version": "1",
  "coVideo": true,
  "coHls": true,
  "luotXem": 128,
  "url": "/api/lectures/12/hls/index.m3u8"
}
```

| Trường            | Kiểu           | Mô tả                                                     |
| ----------------- | -------------- | -------------------------------------------------------- |
| `baiGiangId`      | int            | Id bài giảng                                             |
| `chiTietId`       | int            | Id chi tiết đăng ký bài giảng (chương)                   |
| `tenBaiGiang`     | string         | Tên bài giảng                                            |
| `noiDungChuong`   | string         | Nội dung chương                                          |
| `noiDungBaiGiang` | string         | Nội dung bài giảng                                       |
| `subjectName`     | string         | Tên môn học                                              |
| `version`         | string         | Phiên bản môn học                                        |
| `coVideo`         | boolean        | Có video gốc hay chưa                                    |
| `coHls`           | boolean        | Có bản HLS để phát hay chưa                              |
| `luotXem`         | int            | Số lượt xem                                              |
| `url`             | string \| null | URL phát HLS; **`null` nếu chưa có HLS** (`coHls=false`) |

> **Cách phát:** khi `coHls = true`, API tự set **cookie HttpOnly** chứa token phát
> (scope theo path `/api/lectures/:id/hls`). Trình phát chỉ cần trỏ `<video>`/hls.js
> vào `url` — token **không** nằm trên URL nên copy link ra ngoài sẽ `401`.

**Lỗi**

| Mã    | Trường hợp                        |
| ----- | --------------------------------- |
| `400` | Id không hợp lệ                    |
| `401` | Sai/thiếu `x-teacher-key`          |
| `404` | Không tìm thấy bài giảng           |

**Ví dụ cURL**

```bash
curl "http://localhost:5999/api/lectures/12/teacher" \
  -H "x-teacher-key: <KEY_LOGIN_TEACHER>"
```

---

## 3. Xóa video

Xóa video của bài giảng: dọn **toàn bộ** `stream/` + `chunk/` trên MinIO và đặt lại
`LinkBaiGiang`, `LinkChunkBaiGiang` về `null` trong DB.

```
DELETE /api/lectures/:id/video
```

**Headers**

| Header          | Bắt buộc | Ghi chú             |
| --------------- | :------: | ------------------- |
| `x-api-key`     |    ✅    | `UPLOAD_API_KEY`    |
| `x-teacher-key` |    ✅    | `KEY_LOGIN_TEACHER` |

**Path params**

| Tham số | Kiểu | Mô tả        |
| ------- | ---- | ------------ |
| `id`    | int  | Id bài giảng |

**Ràng buộc trạng thái:** chỉ xóa được khi video đã **hoàn chỉnh** (`status = completed`:
có đủ `stream/` + `chunk/index.m3u8` + ≥1 `.ts`). Đang xử lý hoặc chưa đủ → `409`
(tránh xóa nhầm khi đang upload dang dở).

**Response `200`**

```json
{
  "idBaiGiang": 12,
  "message": "Xóa video bài giảng thành công"
}
```

**Lỗi**

| Mã    | Trường hợp                                          |
| ----- | -------------------------------------------------- |
| `400` | Id không hợp lệ                                     |
| `401` | Sai `x-api-key` hoặc `x-teacher-key`                |
| `404` | Không tìm thấy bài giảng                            |
| `409` | Video đang xử lý / chưa đủ stream + chunk           |
| `500` | Chưa cấu hình `UPLOAD_API_KEY`                      |

**Ví dụ cURL**

```bash
curl -X DELETE "http://localhost:5999/api/lectures/12/video" \
  -H "x-api-key: <UPLOAD_API_KEY>" \
  -H "x-teacher-key: <KEY_LOGIN_TEACHER>"
```

---

## Phụ lục: biến môi trường liên quan

| Biến                | Mặc định | Mô tả                                            |
| ------------------- | -------- | ------------------------------------------------ |
| `UPLOAD_API_KEY`    | —        | Key cho `x-api-key` (upload/xóa)                 |
| `KEY_LOGIN_TEACHER` | —        | Key giảng viên cho `x-teacher-key`               |
| `MAX_VIDEO_MB`      | `2048`   | Dung lượng tối đa mỗi video (MB)                 |
| `HLS_SEGMENT_TIME`  | `6`      | Độ dài mỗi segment HLS (giây)                    |
| `HLS_TOKEN_TTL`     | `2h`     | Hạn token phát HLS                               |
| `FFMPEG_PATH`       | —        | Đường dẫn ffmpeg (mặc định dùng `ffmpeg-static`) |
