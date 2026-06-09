# API Bài giảng — Tổng hợp

Tài liệu các API liên quan tới **môn học, đăng ký bài giảng, upload và xem video bài giảng**.

- Base URL (dev): `http://localhost:3000/api` (FE gọi qua proxy Vite `/api`)
- Xác thực: gửi **wstoken LMS** ở header `Authorization: Bearer <token>` (FE tự gắn từ `localStorage.moodle_token`).
- Lưu trữ video: MinIO, **bucket private**. Video chỉ phát qua proxy backend có token, không lộ URL MinIO.
- Cấu trúc thư mục trên MinIO: `[ma_tuquan]/[version]/[idChiTiet]/{stream,chunk}/`
  - `stream/video.<ext>` — video gốc
  - `chunk/index.m3u8` + `seg_*.ts` — bản HLS để phát

---

## 1. Danh sách môn học + phiên bản

```
GET /api/monhoc
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
GET /api/baigiang/chi-tiet?monHocVersionId=<id>
```

| Query | Bắt buộc | Mô tả |
|-------|----------|-------|
| `monHocVersionId` | ✅ | Id phiên bản môn (`tb_monhoc_version.id`) |

**Response 200**
```json
{
  "monHocVersionId": 1,
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
POST /api/baigiang/chi-tiet/:chiTietId/ensure
```

**Response 200**
```json
{ "chiTietId": 1, "baiGiangId": 6 }
```

**Lỗi:** `404` nếu không tìm thấy chi tiết đăng ký.

---

## 4. Upload video bài giảng

Tải 1 file video lên cho 1 bài giảng. Backend lưu video gốc vào `stream/`, transcode sang HLS (ffmpeg) vào `chunk/`, rồi lưu **object key tương đối** vào DB (không lưu URL tuyệt đối).

```
POST /api/baigiang/:id/upload-video
Content-Type: multipart/form-data
Authorization: Bearer <wstoken>
x-api-key: <UPLOAD_API_KEY>
```

### Tham số đường dẫn (path)

| Tham số | Kiểu | Bắt buộc | Mô tả |
|---------|------|----------|-------|
| `:id` | number | ✅ | `baiGiangId` của bài giảng cần gắn video (lấy từ API *ensure* ở mục 3) |

### Header

| Header | Bắt buộc | Mô tả |
|--------|----------|-------|
| `x-api-key` | ✅ | Khóa bí mật, phải khớp `UPLOAD_API_KEY` cấu hình ở backend. Sai/thiếu → `401`. Bảo vệ riêng cho endpoint upload |
| `Authorization` | ✅ | `Bearer <wstoken>` — wstoken LMS để xác thực |
| `Content-Type` | ✅ | `multipart/form-data` (client tự set kèm boundary khi gửi `FormData`) |

### Body — `multipart/form-data`

| Field | Kiểu | Bắt buộc | Ràng buộc |
|-------|------|----------|-----------|
| `video` | File | ✅ | Định dạng video (`video/*`, vd `.mp4`, `.mov`, `.mkv`). Dung lượng tối đa `MAX_VIDEO_MB` (mặc định **2048 MB**) |

> Mỗi request chỉ nhận **1 file** ở field tên đúng `video`. Upload lại cho cùng `:id` sẽ **ghi đè** video/HLS cũ.

### Backend xử lý

1. Nhận file vào thư mục tạm.
2. Upload video gốc → `[ma_tuquan]/[version]/[idChiTiet]/stream/video.<ext>`.
3. Transcode HLS bằng ffmpeg → `chunk/index.m3u8` + `seg_*.ts` (đoạn dài `HLS_SEGMENT_TIME` giây).
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
| `prefix` | string | Tiền tố thư mục trên MinIO: `[ma_tuquan]/[version]/[idChiTiet]` |
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
| Thiếu / sai wstoken | `401` | `{ "message": "Chưa đăng nhập" }` |
| Không gửi field `video` | `400` | `{ "message": "Thiếu file video" }` |
| File vượt `MAX_VIDEO_MB` | `413` | `{ "message": "Video quá dung lượng cho phép" }` |
| Không tìm thấy bài giảng `:id` | `404` | `{ "message": "Không tìm thấy bài giảng" }` |
| Lỗi MinIO / ffmpeg khi xử lý | `500` | `{ "message": "..." }` |

### Ví dụ

**curl**
```bash
curl -X POST http://localhost:3000/api/baigiang/6/upload-video \
  -H "x-api-key: <UPLOAD_API_KEY>" \
  -H "Authorization: Bearer <wstoken>" \
  -F "video=@bai1.mp4"
```

**JavaScript (fetch + FormData)**
```js
const form = new FormData()
form.append('video', file) // file từ <input type="file">

const res = await fetch(`/api/baigiang/${baiGiangId}/upload-video`, {
  method: 'POST',
  headers: {
    'x-api-key': UPLOAD_API_KEY,           // khớp UPLOAD_API_KEY của backend
    Authorization: `Bearer ${wstoken}`,    // KHÔNG tự set Content-Type
  },
  body: form,
})
const data = await res.json()
```

---

## 5. Danh sách video để xem — *trang sinh viên (CoursePlayer)*

```
GET /api/baigiang/danh-sach?maMon=<ma_tuquan>&version=<version>
```

| Query | Bắt buộc | Mô tả |
|-------|----------|-------|
| `maMon` | ✅ | Mã môn (`tb_monhoc.ma_tuquan`) |
| `version` | ❌ | Phiên bản; bỏ trống = mọi phiên bản |

Chỉ trả các bài giảng **đã có video**.

**Response 200**
```json
{
  "maMon": "2101420",
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
> **Không trả URL MinIO.** Muốn phát thì xin token ở mục 6.

---

## 6. Xin token phát video (HLS)

Đổi phiên đăng nhập LMS lấy **token phát video** ngắn hạn, ký riêng cho đúng 1 `baiGiangId`. Token này dùng cho mục 7 (không dùng lại wstoken khi stream).

```
GET /api/baigiang/:id/playback-token
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
  "url": "/api/baigiang/6/hls/index.m3u8?token=eyJhbGciOiJIUzI1NiJ9..."
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
GET /api/baigiang/:id/hls/:file?token=<token>
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
const res = await fetch(`/api/baigiang/${baiGiangId}/playback-token`, {
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

## Luồng sử dụng

**Giảng viên (quản lý bài giảng):**
1. `GET /api/monhoc` → chọn môn + phiên bản
2. `GET /api/baigiang/chi-tiet?monHocVersionId=` → danh sách chương
3. (nếu chương chưa có) `POST /api/baigiang/chi-tiet/:chiTietId/ensure` → lấy `baiGiangId`
4. `POST /api/baigiang/:id/upload-video` → tải video lên

**Sinh viên (xem bài giảng):**
1. `GET /api/baigiang/danh-sach?maMon=&version=` → danh sách video
2. `GET /api/baigiang/:id/playback-token` → xin token
3. Phát `url` trả về (mục 7) bằng hls.js

---

## Biến môi trường liên quan (`.env`)

```
MINIO_ENDPOINT=http://localhost:9000
MINIO_BUCKET=baigiang
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
FFMPEG_PATH=            # trống = dùng ffmpeg-static
HLS_SEGMENT_TIME=6      # độ dài mỗi .ts (giây)
MAX_VIDEO_MB=2048       # dung lượng video tối đa
HLS_TOKEN_TTL=6h        # thời hạn token xem video
JWT_SECRET=...          # ký token phát video
UPLOAD_API_KEY=...      # khóa bảo vệ endpoint upload (header x-api-key)
```
> FE phải gửi đúng `UPLOAD_API_KEY` này qua header `x-api-key` khi upload. Bên FE (Vite) đọc từ biến build `VITE_UPLOAD_API_KEY` — đặt cùng giá trị với backend.
