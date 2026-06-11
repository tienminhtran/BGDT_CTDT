# API Quản Lý & Upload Bài Giảng — App Giảng Viên (IUH_FE_Teacher)

Tài liệu cho trang **Quản lý bài giảng**: chọn môn/phiên bản, xem chương và **tải video lên**.
Phần xem video tách riêng ở [API_XemVideo.md](./API_XemVideo.md).

- **Base URL:** `/api` (cấu hình `VITE_API_BASE_URL`)
- **Không đăng nhập.** App tự gắn `x-teacher-key` vào mọi request.

| Header | Giá trị | Dùng cho |
|---|---|---|
| `x-teacher-key` | `KEY_LOGIN_TEACHER` | Gắn sẵn mọi request (xem video) |
| `x-api-key` | `UPLOAD_API_KEY` | **Bắt buộc khi UPLOAD video** |

> ⚠️ **Upload dùng `x-api-key` (`UPLOAD_API_KEY`), KHÔNG phải `KEY_LOGIN_TEACHER`.**
> `VITE_UPLOAD_API_KEY` (frontend) phải **khớp** `UPLOAD_API_KEY` (backend).

---

## Luồng quản lý + upload

```
(1) GET /subjects ──► chọn môn + phiên bản (versionId)
        │
        ▼
(2) GET /lectures/chapters?subjectVersionId=versionId ──► danh sách chương (chiTietId, baiGiangId?)
        │
        ▼ (khi tải lên 1 chương)
(3) POST /lectures/chapters/:chapterId/ensure ──► baiGiangId   (chỉ khi chương chưa có baiGiangId)
        │
        ▼
(4) POST /lectures/:baiGiangId/video  (x-api-key, form-data) ──► { coVideo, coHls, ... }
```

---

### 1) Danh sách môn học + phiên bản

- **Method:** `GET`
- **URL:** `/api/subjects`
- **Response:**

```json
{
  "monHoc": [
    {
      "id": 7,
      "maTuQuan": "2101420",
      "tenMon": "Công nghệ phần mềm",
      "versions": [ { "id": 12, "version": "1" } ]
    }
  ]
}
```

| Trường | Mô tả |
|---|---|
| `id` | ID môn học (nội bộ) |
| `maTuQuan` | Mã môn — dùng để tạo token xem video |
| `versions[].id` | ID phiên bản — dùng cho bước 2 (`subjectVersionId`) |
| `versions[].version` | Tên phiên bản (vd `1`) — dùng để tạo token xem video |

- **Frontend:** `monHocService.getMonHoc()`

---

### 2) Danh sách chương theo phiên bản

- **Method:** `GET`
- **URL:** `/api/lectures/chapters?subjectVersionId=<versionId>`
- **Query:**

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `subjectVersionId` | ✅ | `versions[].id` ở bước 1 |

- **Response:**

```json
{
  "subjectVersionId": 12,
  "chiTiet": [
    {
      "chiTietId": 55,
      "NoiDungChuong": "Chương 1: Tổng quan",
      "GhiChu": null,
      "dangKyId": 9,
      "baiGiangId": 1002,
      "TenBaiGiang": "Bài 1",
      "coVideo": true,
      "coHls": true
    }
  ]
}
```

| Trường | Mô tả |
|---|---|
| `chiTietId` | ID chương — dùng cho bước 3 (ensure) |
| `baiGiangId` | ID bài giảng; **`null`** nếu chương chưa có bài giảng |
| `coVideo` / `coHls` | Đã có video gốc / bản HLS chưa |

- **Frontend:** `baiGiangService.getChiTiet(subjectVersionId)`

---

### 3) Đảm bảo có bài giảng cho chương (ensure)

Gọi **khi chương chưa có `baiGiangId`** (tạo mới rồi trả về), trước khi upload.

- **Method:** `POST`
- **URL:** `/api/lectures/chapters/:chapterId/ensure`
- **Path param:** `chapterId` = `chiTietId` ở bước 2
- **Response:** `{ "chapterId": 55, "baiGiangId": 1002 }`
- **Frontend:** `baiGiangService.ensureBaiGiang(chapterId)`

---

### 4) Upload video

> 🔑 **Cần header `x-api-key: <UPLOAD_API_KEY>`.** Thiếu/sai → `401 { "message": "API key không hợp lệ" }`.

- **Method:** `POST`
- **URL:** `/api/lectures/:baiGiangId/video`
- **Headers:**
  - `x-api-key: <UPLOAD_API_KEY>`
  - `Content-Type: multipart/form-data`
- **Body (form-data):**

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `video` | file | ✅ | File video (`video/*`), tối đa `MAX_VIDEO_MB` (mặc định 2048 MB) |

- **Response:**

```json
{
  "idBaiGiang": 1002,
  "prefix": "2101420/1/55",
  "coVideo": true,
  "coHls": true,
  "hlsSkipped": false,
  "message": "Upload thành công"
}
```

| Trường | Mô tả |
|---|---|
| `coVideo` | Đã lưu video gốc |
| `coHls` | Đã tạo bản phát HLS (cần ffmpeg ở backend) |
| `hlsSkipped` | `true` nếu backend không có ffmpeg → chỉ lưu video gốc, chưa phát HLS được |

- **Frontend:** `baiGiangService.uploadVideo(baiGiangId, file)` — tự đính `x-api-key` và `multipart/form-data`.

```js
// Trong app: ensure (nếu cần) rồi upload
let id = row.baiGiangId
if (!id) id = await ensureBaiGiang(row.chiTietId)
const data = await uploadVideo(id, file)
```

---

### 5) Xem nhanh 1 video theo mã bài giảng

> 🔑 **Cần header `x-teacher-key: <KEY_LOGIN_TEACHER>`** (app gắn sẵn). Sai/thiếu → `401`.

Xem 1 video riêng lẻ **chỉ bằng `id` (tb_BaiGiang)** — KHÔNG cần mã môn/phiên bản hay token khóa học.
Trả về metadata + token/url phát HLS trong **1 lần gọi**.

- **Method:** `GET`
- **URL:** `/api/lectures/:baiGiangId/teacher`
- **Headers:** `x-teacher-key: <KEY_LOGIN_TEACHER>`
- **Response:**

```json
{
  "baiGiangId": 1002,
  "chiTietId": 55,
  "tenBaiGiang": "Bài 1",
  "noiDungChuong": "Chương 1: Tổng quan",
  "subjectName": "Công nghệ phần mềm",
  "version": "1",
  "coVideo": true,
  "coHls": true,
  "token": "<jwt>",
  "url": "/api/lectures/1002/hls/index.m3u8?token=<jwt>"
}
```

| Trường | Mô tả |
|---|---|
| `coHls` | Chỉ phát được khi `true` |
| `token` / `url` | `null` nếu chưa có HLS; ngược lại dùng `url` cho trình phát |

- **Frontend:** `baiGiangService.getVideoTheoId(baiGiangId)`
- **Trang:** `/video/:id` (vd `/video/1002`) — ô "Xem nhanh video theo mã bài giảng".

---

## Lưu ý

- Backend lưu video lên **MinIO** theo cấu trúc `maTuQuan/version/chiTietId/{stream,chunk}`,
  DB chỉ lưu object key (không lộ URL/bucket ra client).
- Nếu `hlsSkipped = true`: video đã lên nhưng **chưa phát được** (cần cài ffmpeg ở backend rồi upload lại).
- nginx của container giảng viên đã cho phép body lớn (`client_max_body_size 2048m`).

---

## Tóm tắt: "upload cần truyền gì?"

1. **`x-api-key`** = `UPLOAD_API_KEY` (header) — **bắt buộc**.
2. **`baiGiangId`** ở path (lấy từ bước 2, hoặc tạo qua bước 3 ensure).
3. **`video`** = file ở form-data.

`KEY_LOGIN_TEACHER` **không** dùng cho upload (chỉ dùng cho xem video).
