# API Video Bài giảng

Tài liệu 4 API phục vụ luồng quản lý video bài giảng:

1. [Danh sách môn học + phiên bản](#1-danh-sách-môn-học--phiên-bản)
2. [Upload video](#2-upload-video)
3. [Xem 1 video theo id bài giảng](#3-xem-1-video-theo-id-bài-giảng)
4. [Xóa video](#4-xóa-video)

**Base URL:** `/api` — mục 1 dùng `/api/subjects`, mục 2–4 dùng `/api/lectures`.
Server dev mặc định chạy ở `http://localhost:3000` (biến `PORT`).

## Xác thực (Headers)

| Header          | Giá trị             | Dùng cho                      |
| --------------- | ------------------- | ----------------------------- |
| _(không cần)_   | —                   | Danh sách môn học (mục 1)     |
| `x-api-key`     | `UPLOAD_API_KEY`    | Upload, Xóa (bảo vệ endpoint) |
| `x-teacher-key` | `KEY_LOGIN_TEACHER` | Xem (giảng viên), Xóa         |

> Cả hai key được cấu hình bằng biến môi trường trên server. Thiếu/sai key → `401`
> (riêng thiếu cấu hình `UPLOAD_API_KEY` trên server → `500`).

---

## 1. Danh sách môn học + phiên bản

Lấy danh sách môn học kèm các phiên bản (version) của môn — dùng để đổ dropdown
"Môn học → Phiên bản" trước khi chọn chương và upload video.

Có **2 biến thể**:

| Endpoint                     | Trả về                                                        | Dùng khi                                                       |
| ---------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| `GET /api/subjects`          | **Tất cả** môn học + mọi phiên bản (kể cả môn chưa có phiên bản) | Chọn môn/phiên bản để tạo & upload bài giảng                   |
| `GET /api/subjects/with-hashcode` | Chỉ các cặp môn + phiên bản **đã có bài giảng**, kèm `hashcode` | Cần link trang xem bài giảng (`/bai-giang-dien-tu/<hashcode>`) |

### 1.1 `GET /api/subjects`

Không cần header xác thực.

**Response `200`**

```json
{
  "monHoc": [
    {
      "id": 5,
      "maTuQuan": "2101420",
      "tenMon": "Lập trình Web",
      "versions": [
        { "id": 11, "version": "1" },
        { "id": 12, "version": "2" }
      ]
    },
    {
      "id": 7,
      "maTuQuan": "2101431",
      "tenMon": "Cơ sở dữ liệu",
      "versions": []
    }
  ]
}
```

| Trường               | Kiểu   | Mô tả                                                      |
| -------------------- | ------ | ---------------------------------------------------------- |
| `monHoc`             | array  | Danh sách môn học, sắp xếp theo `tenMon` tăng dần          |
| `monHoc[].id`        | int    | Id môn học (`tb_monhoc.id`)                                |
| `monHoc[].maTuQuan`  | string | Mã môn (`ma_tuquan`) — dùng làm thư mục gốc trên MinIO     |
| `monHoc[].tenMon`    | string | Tên môn học                                                |
| `monHoc[].versions`  | array  | Các phiên bản của môn, sắp xếp theo `version` tăng dần; **mảng rỗng nếu môn chưa có phiên bản** |
| `versions[].id`      | int    | Id phiên bản (`tb_monhoc_version.id`) — chính là `subjectVersionId` truyền cho `GET /api/lectures/chapters` |
| `versions[].version` | string | Tên phiên bản                                              |

**Ví dụ cURL**

```bash
curl "http://localhost:3000/api/subjects"
```

### 1.2 `GET /api/subjects/with-hashcode`

Chỉ liệt kê các cặp **môn + phiên bản đã có bài giảng** (đi từ `tb_BaiGiang` lên), đã
lọc trùng. Mỗi dòng kèm `hashcode` — token mờ AES‑256‑GCM của `{maMon, version}`,
dùng làm đường dẫn trang xem bài giảng để **không lộ mã môn** ra client.

**Response `200`**

```json
{
  "monHoc": [
    {
      "maMon": "2101420",
      "tenMon": "Lập trình Web",
      "version": "1",
      "hashcode": "T2xkZXJ...Q0dR"
    }
  ]
}
```

| Trường     | Kiểu   | Mô tả                                                             |
| ---------- | ------ | ----------------------------------------------------------------- |
| `maMon`    | string | Mã môn (`ma_tuquan`)                                              |
| `tenMon`   | string | Tên môn học                                                       |
| `version`  | string | Phiên bản môn học                                                 |
| `hashcode` | string | Token khóa học (URL-safe). Dùng cho `/bai-giang-dien-tu/<hashcode>` và `GET /api/lectures?course=<hashcode>` |

> `hashcode` được sinh lại mỗi lần gọi (IV ngẫu nhiên) nên **giá trị khác nhau giữa các
> lần gọi vẫn hợp lệ** — không dùng nó làm khóa so sánh/cache.

**Lỗi (cả 2 endpoint)**

| Mã    | Trường hợp        |
| ----- | ----------------- |
| `500` | Lỗi truy vấn DB   |

**Ví dụ cURL**

```bash
curl "http://localhost:3000/api/subjects/with-hashcode"
```

---

## 2. Upload video

Upload 1 file video cho bài giảng. File gốc được lưu vào
`stream/[ma_tuquan]/[version]/[idChiTiet]/video.<ext>` trên MinIO, đồng thời transcode sang
HLS (`chunk/[ma_tuquan]/[version]/[idChiTiet]/index.m3u8` + các `.ts`) nếu server có `ffmpeg`.

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
| `prefix`     | string  | Phần chung của đường dẫn MinIO `[ma_tuquan]/[version]/[idChiTiet]`; key thật là `stream/<prefix>/...` và `chunk/<prefix>/...` |
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
curl -X POST "http://localhost:3000/api/lectures/12/video" \
  -H "x-api-key: <UPLOAD_API_KEY>" \
  -F "video=@baigiang01.mp4"
```

---

## 3. Xem 1 video theo id bài giảng

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
curl "http://localhost:3000/api/lectures/12/teacher" \
  -H "x-teacher-key: <KEY_LOGIN_TEACHER>"
```

---

## 4. Xóa video

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
curl -X DELETE "http://localhost:3000/api/lectures/12/video" \
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
