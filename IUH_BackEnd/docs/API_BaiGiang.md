# API Bài giảng & Đánh giá — Tổng hợp

Tài liệu các API liên quan tới **môn học, đăng ký bài giảng, upload/xem video và đánh giá bài giảng**.

- Base URL (dev): `http://localhost:3000/api` (FE gọi qua proxy Vite `/api`)
- Xác thực: gửi **wstoken LMS** ở header `Authorization: Bearer <token>` (FE tự gắn từ `localStorage.moodle_token`).
- Lưu trữ video: MinIO, **bucket private**. Video chỉ phát qua proxy backend có token, không lộ URL MinIO.
- Cấu trúc thư mục trên MinIO: `{stream,chunk}/[ma_tuquan]/[version]/[idChiTiet]/`
  - `stream/[ma_tuquan]/[version]/[idChiTiet]/video.<ext>` — video gốc
  - `chunk/[ma_tuquan]/[version]/[idChiTiet]/index.m3u8` + `seg_*.ts` — bản HLS để phát

> **Đặt tên endpoint dùng tiếng Anh.** Bảng đối chiếu với tên cũ:
>
> | Cũ (tiếng Việt) | Mới (tiếng Anh) |
> |---|---|
> | `GET /monhoc` | `GET /subjects` |
> | `GET /baigiang/chi-tiet?monHocVersionId=` | `GET /lectures/chapters?subjectVersionId=` |
> | `POST /baigiang/chi-tiet/:id/ensure` | `POST /lectures/chapters/:chapterId/ensure` |
> | `POST /baigiang/:id/upload-video` | `POST /lectures/:id/video` |
> | `GET /baigiang/danh-sach?maMon=&version=` | `GET /lectures?course=<token>` |
> | `GET /baigiang/:id/playback-token` | `GET /lectures/:id/playback-token` |
> | `GET /baigiang/:id/hls/:file` | `GET /lectures/:id/hls/:file` |
> | `GET /sinhvien-hocphan/kiem-tra/:maMon` | `GET /student-courses/access?course=<token>` |
> | `/danhgia/:id` · `/danhgia/:id/sinh-vien` | `/reviews/:lectureId` · `/reviews/:lectureId/mine` |

---

## 0. Token khóa học (course token) — ẩn mã môn

Để **không lộ mã môn (`ma_tuquan`) ra client** (URL, query, response), mã môn + phiên bản được đóng gói thành 1 **token mờ** mã hóa **AES‑256‑GCM** bằng khóa bí mật của server (`COURSE_TOKEN_SECRET`, fallback `JWT_SECRET`). Token này **chỉ server giải được** (khác Base64 — không giải ngược ở client).

Token dùng cho: URL trang xem bài giảng `/bai-giang-dien-tu/<token>`, tham số `?course=<token>` ở mục 5 và mục 8.

### Sinh token

```
POST /api/lectures/token
Content-Type: application/json
```

**Body**
```json
{ "courseCode": "2101420", "version": "1" }
```

| Field | Bắt buộc | Mô tả |
|-------|----------|-------|
| `courseCode` | ✅ | Mã môn (`tb_monhoc.ma_tuquan`) |
| `version` | ❌ | Phiên bản; bỏ trống = mọi phiên bản |

**Response 200**
```json
{ "token": "P4FVVS8N_Sc3yNWvqBYk1KtgFEs_sCWthqg3NA7bAG88..." }
```

**Lỗi:** `400` nếu thiếu `courseCode`.

---

## 1. Danh sách môn học + phiên bản

```
GET /api/subjects
```

**Response 200**
```json
{
  "monHoc": [
    {
      "id": 12,
      "maTuQuan": "2101420",
      "tenMon": "Công nghệ phần mềm",
      "versions": [
        { "id": 1, "version": "1" },
        { "id": 5, "version": "2" }
      ]
    }
  ]
}
```

---

## 2. Danh sách chương (chi tiết đăng ký) theo phiên bản — *trang quản lý*

```
GET /api/lectures/chapters?subjectVersionId=<id>
```

| Query | Bắt buộc | Mô tả |
|-------|----------|-------|
| `subjectVersionId` | ✅ | Id phiên bản môn (`tb_monhoc_version.id`) |

**Response 200**
```json
{
  "subjectVersionId": 1,
  "chiTiet": [
    {
      "chiTietId": 1,
      "NoiDungChuong": "Chương 1: Tổng quan về Công nghệ phần mềm",
      "GhiChu": null,
      "dangKyId": 3,
      "baiGiangId": 6,
      "TenBaiGiang": "Chương 1: ...",
      "coVideo": true,
      "coHls": true
    }
  ]
}
```
> `coVideo` = đã có video gốc; `coHls` = đã có bản HLS để phát. **Không trả URL MinIO.**

---

## 3. Lấy/tạo bài giảng cho 1 chương

Mỗi chương (chi tiết đăng ký) ứng 1 bài giảng (quan hệ 1-1). Gọi trước khi upload nếu chương chưa có bài giảng.

```
POST /api/lectures/chapters/:chapterId/ensure
```

| Tham số | Vị trí | Bắt buộc | Mô tả |
|---------|--------|----------|-------|
| `:chapterId` | path | ✅ | `chiTietId` của chương (`tb_ChiTietDangKyBaiGiang.Id`) |

**Response 200**
```json
{ "chapterId": 1, "baiGiangId": 6 }
```

**Lỗi:** `404` nếu không tìm thấy chi tiết đăng ký.

---

## 4. Upload video bài giảng

Tải 1 file video lên cho 1 bài giảng. Backend lưu video gốc vào `stream/`, transcode sang HLS (ffmpeg) vào `chunk/`, rồi lưu **object key tương đối** vào DB (không lưu URL tuyệt đối).

```
POST /api/lectures/:id/video
Content-Type: multipart/form-data
x-api-key: <UPLOAD_API_KEY>
```

> Endpoint này **không cần** đăng nhập LMS (wstoken). Chỉ cần `x-api-key` đúng — phù hợp cho công cụ upload riêng (desktop, script…).

### Tham số đường dẫn (path)

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `:id` | number | ✅ | `baiGiangId` của bài giảng cần gắn video (lấy từ API *ensure* ở mục 3) |

### Header

| Header | Bắt buộc | Mô tả |
|--------|----------|-------|
| `x-api-key` | ✅ | Khóa bí mật, phải khớp `UPLOAD_API_KEY` cấu hình ở backend. Sai/thiếu → `401`. Bảo vệ riêng cho endpoint upload |
| `Content-Type` | ✅ | `multipart/form-data` (client tự set kèm boundary khi gửi `FormData`) |

### Body — `multipart/form-data`

| Field | Kiểu | Bắt buộc | Ràng buộc |
|-------|------|----------|-----------|
| `video` | File | ✅ | Định dạng video (`video/*`, vd `.mp4`, `.mov`, `.mkv`). Dung lượng tối đa `MAX_VIDEO_MB` (mặc định **2048 MB**) |

> Mỗi request chỉ nhận **1 file** ở field tên đúng `video`. Upload lại cho cùng `:id` sẽ **ghi đè** video/HLS cũ.

### Backend xử lý

1. Nhận file vào thư mục tạm.
2. Upload video gốc → `stream/[ma_tuquan]/[version]/[idChiTiet]/video.<ext>`.
3. Transcode HLS bằng ffmpeg → `chunk/[ma_tuquan]/[version]/[idChiTiet]/index.m3u8` + `seg_*.ts` (đoạn dài `HLS_SEGMENT_TIME` giây).
4. Lưu object key vào DB, xoá file tạm, trả kết quả.

### Response 200

```json
{
  "idBaiGiang": 6,
  "prefix": "2101420/1/1",
  "coVideo": true,
  "coHls": true,
  "hlsSkipped": false,
  "message": "Upload thành công"
}
```

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `idBaiGiang` | number | `baiGiangId` vừa cập nhật |
| `prefix` | string | Phần chung của đường dẫn MinIO: `[ma_tuquan]/[version]/[idChiTiet]` (key thật = `stream/<prefix>/...` và `chunk/<prefix>/...`) |
| `coVideo` | boolean | Đã lưu video gốc thành công |
| `coHls` | boolean | Đã tạo được bản HLS để phát |
| `hlsSkipped` | boolean | `true` khi bỏ qua transcode HLS (máy không có ffmpeg) |
| `message` | string | Thông báo kết quả |

> `hlsSkipped: true` + `coHls: false` ⇒ chỉ lưu video gốc, không có bản HLS. Cần cài ffmpeg (hoặc đặt `FFMPEG_PATH`) rồi upload lại để có HLS.

### Bảng lỗi

| Tình huống | HTTP | Body (ví dụ) |
|-----------|------|--------------|
| Thiếu / sai `x-api-key` | `401` | `{ "message": "API key không hợp lệ" }` |
| Server chưa cấu hình `UPLOAD_API_KEY` | `500` | `{ "message": "Chưa cấu hình UPLOAD_API_KEY trên server" }` |
| Không gửi field `video` | `400` | `{ "message": "Thiếu file video" }` |
| File vượt `MAX_VIDEO_MB` | `413` | `{ "message": "Video quá dung lượng cho phép" }` |
| Không tìm thấy bài giảng `:id` | `404` | `{ "message": "Không tìm thấy bài giảng" }` |
| Lỗi MinIO / ffmpeg khi xử lý | `500` | `{ "message": "..." }` |

### Ví dụ

**curl**
```bash
curl -X POST http://localhost:3000/api/lectures/6/video \
  -H "x-api-key: <UPLOAD_API_KEY>" \
  -F "video=@bai1.mp4"
```

**JavaScript (fetch + FormData)**
```js
const form = new FormData()
form.append('video', file) // file từ <input type="file">

const res = await fetch(`/api/lectures/${baiGiangId}/video`, {
  method: 'POST',
  headers: { 'x-api-key': UPLOAD_API_KEY }, // KHÔNG tự set Content-Type
  body: form,
})
const data = await res.json()
```

**C# (HttpClient + MultipartFormDataContent)**
```csharp
using var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", apiKey); // chỉ cần apiKey, bỏ wstoken

using var form = new MultipartFormDataContent();
using var fs = File.OpenRead(filePath);
form.Add(new StreamContent(fs), "video", Path.GetFileName(filePath));

var res = await client.PostAsync(
    $"http://localhost:3000/api/lectures/{baiGiangId}/video", form);
var json = await res.Content.ReadAsStringAsync();
```

---

## 5. Danh sách video để xem — *trang sinh viên (CoursePlayer)*

```
GET /api/lectures?course=<token>
```

| Query | Bắt buộc | Mô tả |
|-------|----------|-------|
| `course` | ✅ | **Token mờ** lấy từ mục 0 (mã hóa mã môn + phiên bản). **Không** truyền `maMon` thô. |

Chỉ trả các bài giảng **đã có video**. Backend giải token → mã môn/phiên bản và **không trả mã môn ra ngoài** (chỉ trả `subjectName` để hiển thị).

**Response 200**
```json
{
  "subjectName": "Công nghệ phần mềm",
  "version": "1",
  "videos": [
    {
      "baiGiangId": 6,
      "chiTietId": 1,
      "noiDungChuong": "Chương 1: Tổng quan về Công nghệ phần mềm",
      "tenBaiGiang": "Chương 1: ...",
      "version": "1",
      "coVideo": true,
      "coHls": true
    }
  ]
}
```
> **Không trả URL MinIO, không trả mã môn.** Muốn phát thì xin token ở mục 6.

**Lỗi:** `400` nếu thiếu/sai `course` (token không hợp lệ).

---

## 6. Xin token phát video (HLS)

Đổi phiên đăng nhập LMS lấy **token phát video** ngắn hạn, ký riêng cho đúng 1 `baiGiangId`. Token này dùng cho mục 7 (không dùng lại wstoken khi stream).

```
GET /api/lectures/:id/playback-token
Authorization: Bearer <wstoken>
```

### Tham số đường dẫn (path)

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `:id` | number | ✅ | `baiGiangId` của video muốn xem (lấy từ danh sách mục 5) |

### Header

| Header | Bắt buộc | Mô tả |
|--------|----------|-------|
| `Authorization` | ✅ | `Bearer <wstoken>` — wstoken LMS để xác thực người xem |

### Response 200

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "url": "/api/lectures/6/hls/index.m3u8?token=eyJhbGciOiJIUzI1NiJ9..."
}
```

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `token` | string | JWT ký bằng `JWT_SECRET`, hết hạn sau `HLS_TOKEN_TTL` (mặc định `6h`), chỉ hợp lệ cho đúng `:id` này |
| `url` | string | Đường dẫn playlist HLS đã gắn sẵn `?token=`; nạp thẳng vào trình phát là chạy |

### Bảng lỗi

| Tình huống | HTTP | Body (ví dụ) |
|-----------|------|--------------|
| Thiếu / sai / hết hạn wstoken | `401` | `{ "message": "Chưa đăng nhập" }` |
| Bài giảng chưa có video | `404` | `{ "message": "Bài giảng chưa có video" }` |

> Token chỉ cấp khi bài giảng đã có bản HLS. Khi token hết hạn → gọi lại mục 6 để xin token mới.

---

## 7. Stream HLS (playlist + segment)

Endpoint trình phát thực sự gọi để tải playlist và các đoạn video. Mọi truy cập đều phải kèm `token` ở mục 6.

```
GET /api/lectures/:id/hls/:file?token=<token>
```

### Tham số

| Tham số | Vị trí | Bắt buộc | Mô tả |
|---------|--------|----------|-------|
| `:id` | path | ✅ | `baiGiangId` — phải khớp `baiGiangId` đã ký trong token |
| `:file` | path | ✅ | `index.m3u8` (playlist) hoặc `seg_xxx.ts` (đoạn video) |
| `token` | query | ✅ | Token lấy từ mục 6 |

> Playlist `index.m3u8` trả về đã **tự gắn `?token=`** cho từng segment, nên hls.js chỉ cần nạp `url` ở mục 6; không phải tự nối token cho các `.ts`.

### Response 200

- `index.m3u8` → `Content-Type: application/vnd.apple.mpegurl`, nội dung playlist HLS.
- `seg_xxx.ts` → `Content-Type: video/mp2t`, luồng nhị phân đoạn video (stream trực tiếp từ MinIO).

### Bảng lỗi

| Tình huống | HTTP |
|-----------|------|
| Thiếu `token` | `401` |
| Token sai / hết hạn | `401` |
| Token không khớp `:id` | `403` |
| File không tồn tại trên MinIO | `404` |
| OK | `200` (m3u8 hoặc luồng `.ts`) |

> Bucket MinIO ở chế độ **private** → **không** truy cập trực tiếp `http://localhost:9000/...` được (403). Mọi luồng video phải đi qua endpoint này.

### Ví dụ phát bằng hls.js

```js
import Hls from 'hls.js'

// 1) Xin token (mục 6)
const res = await fetch(`/api/lectures/${baiGiangId}/playback-token`, {
  headers: { Authorization: `Bearer ${wstoken}` },
})
const { url } = await res.json()

// 2) Nạp playlist vào <video>
const video = document.querySelector('video')
if (Hls.isSupported()) {
  const hls = new Hls()
  hls.loadSource(url)   // url đã chứa ?token=
  hls.attachMedia(video)
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = url       // Safari hỗ trợ HLS sẵn
}
```

---

## 8. Sinh viên – Học phần (`/student-courses`)

### 8.1. Import học phần từ LMS

```
POST /api/student-courses/import
Authorization: Bearer <wstoken>
```
Tự lấy danh sách khóa học từ LMS theo wstoken rồi lưu các `idnumber` (mã học phần) SV chưa có.

**Response 200**
```json
{ "studentId": "21001234", "added": 3, "skipped": 2, "total": 5 }
```

### 8.2. Kiểm tra quyền học khóa

```
GET /api/student-courses/access?course=<token>
Authorization: Bearer <wstoken>
```

| Query | Bắt buộc | Mô tả |
|-------|----------|-------|
| `course` | ✅ | **Token mờ** (mục 0). Backend giải → mã môn rồi đối chiếu học phần của SV. |

Lấy MSSV từ wstoken, kiểm tra SV có thuộc học phần chứa môn này không. **Không trả mã môn ra client.**

**Response 200**
```json
{ "allowed": true }
```

**Lỗi:** `401` (chưa đăng nhập / hết hạn wstoken), `400` (token `course` sai).

---

## 9. Đánh giá bài giảng (`/reviews`)

Sinh viên chấm **sao (1–5)** + **bình luận** cho 1 bài giảng. Mỗi SV chỉ đánh giá **1 lần / bài giảng** (sửa để cập nhật). MSSV luôn lấy từ wstoken, **không nhận từ client**.

### 9.1. Thống kê đánh giá (công khai)

```
GET /api/reviews/:lectureId
```

Trả **thống kê tổng hợp**, **không** trả đánh giá của từng SV (không lộ MSSV/bình luận người khác).

**Response 200**
```json
{
  "lectureId": 6,
  "total": 2,
  "average": 4.5,
  "distribution": { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 }
}
```

| Trường | Kiểu | Ý nghĩa |
|--------|------|---------|
| `total` | number | Tổng số lượt đánh giá |
| `average` | number | Điểm trung bình (0 nếu chưa có) |
| `distribution` | object | Số lượt theo từng mức sao 1–5 |

### 9.2. Đánh giá của chính SV

```
GET /api/reviews/:lectureId/mine
Authorization: Bearer <wstoken>
```

Lấy đánh giá của chính SV (để FE prefill form), `null` nếu chưa có.

**Response 200**
```json
{
  "lectureId": 6,
  "review": {
    "id": 10,
    "lectureId": 6,
    "studentId": "21001234",
    "stars": 5,
    "comment": "Bài giảng hay quá Thầy ạ",
    "createdAt": "2026-06-10T01:21:54.000Z"
  }
}
```
> `review` = `null` nếu SV chưa đánh giá bài giảng này.

### 9.3. Tạo đánh giá

```
POST /api/reviews/:lectureId
Authorization: Bearer <wstoken>
Content-Type: application/json
```

**Body**
```json
{ "stars": 5, "comment": "Bài giảng hay quá Thầy ạ" }
```

| Field | Bắt buộc | Ràng buộc |
|-------|----------|-----------|
| `stars` | ✅ | Số nguyên 1–5 |
| `comment` | ❌ | Tối đa 255 ký tự |

**Response 201**
```json
{
  "message": "Đánh giá thành công",
  "review": { "id": 10, "lectureId": 6, "studentId": "21001234", "stars": 5, "comment": "...", "createdAt": "..." }
}
```

### 9.4. Sửa đánh giá

```
PUT /api/reviews/:lectureId
Authorization: Bearer <wstoken>
Content-Type: application/json
```

**Body** (chỉ gửi trường cần đổi)
```json
{ "stars": 4, "comment": "Cập nhật cảm nhận" }
```

**Response 200**
```json
{ "message": "Cập nhật đánh giá thành công", "review": { "id": 10, "stars": 4, "comment": "...", "createdAt": "..." } }
```

### Bảng lỗi (mục 9)

| Tình huống | HTTP | Body (ví dụ) |
|-----------|------|--------------|
| Chưa đăng nhập / hết hạn wstoken | `401` | `{ "message": "Chưa đăng nhập" }` |
| `stars` ngoài 1–5 | `400` | `{ "message": "Số sao phải từ 1 đến 5" }` |
| SV không thuộc môn của bài giảng | `403` | `{ "message": "Bạn không thuộc môn học (...) của bài giảng này" }` |
| Đã đánh giá rồi (khi POST) | `409` | `{ "message": "Bạn đã đánh giá bài giảng này rồi (dùng sửa để cập nhật)" }` |
| Chưa đánh giá (khi PUT) | `404` | `{ "message": "Bạn chưa đánh giá bài giảng này" }` |

---

## Luồng sử dụng

**Giảng viên (quản lý bài giảng):**
1. `GET /api/subjects` → chọn môn + phiên bản
2. `GET /api/lectures/chapters?subjectVersionId=` → danh sách chương
3. (nếu chương chưa có) `POST /api/lectures/chapters/:chapterId/ensure` → lấy `baiGiangId`
4. `POST /api/lectures/:id/video` → tải video lên

**Sinh viên (xem bài giảng + đánh giá):**
1. `POST /api/lectures/token` (`{courseCode, version}`) → lấy **token mờ**
2. `GET /api/student-courses/access?course=<token>` → kiểm tra quyền học
3. `GET /api/lectures?course=<token>` → danh sách video
4. `GET /api/lectures/:id/playback-token` → xin token phát, rồi phát `url` (mục 7) bằng hls.js
5. `GET /api/reviews/:lectureId` (điểm TB) + `GET /api/reviews/:lectureId/mine` (đánh giá của mình)
6. `POST` / `PUT /api/reviews/:lectureId` → gửi/sửa đánh giá

---

## Biến môi trường liên quan (`.env`)

```
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=baigiang
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
FFMPEG_PATH=               # trống = dùng ffmpeg-static
HLS_SEGMENT_TIME=6         # độ dài mỗi .ts (giây)
MAX_VIDEO_MB=2048          # dung lượng video tối đa
HLS_TOKEN_TTL=6h           # thời hạn token xem video
JWT_SECRET=...             # ký token phát video; fallback khóa course token
COURSE_TOKEN_SECRET=...    # khóa mã hóa course token (ẩn mã môn); trống = dùng JWT_SECRET
UPLOAD_API_KEY=...         # khóa bảo vệ endpoint upload (header x-api-key)
```
> FE phải gửi đúng `UPLOAD_API_KEY` này qua header `x-api-key` khi upload. Bên FE (Vite) đọc từ biến build `VITE_UPLOAD_API_KEY` — đặt cùng giá trị với backend.
>
> **Lưu ý:** đổi `COURSE_TOKEN_SECRET` (hoặc `JWT_SECRET` nếu đang fallback) sẽ làm **mọi course token cũ hết hiệu lực** (URL `/bai-giang-dien-tu/<token>` đã chia sẻ trước đó không mở được nữa).
