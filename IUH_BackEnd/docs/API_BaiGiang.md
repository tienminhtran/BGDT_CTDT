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

```
POST /api/baigiang/:id/upload-video
Content-Type: multipart/form-data
```

| Phần | Mô tả |
|------|-------|
| `:id` | `baiGiangId` (lấy từ API ensure ở mục 3) |
| field `video` | File video (`video/*`), tối đa `MAX_VIDEO_MB` (mặc định 2048 MB) |

Backend sẽ: upload video gốc vào `stream/`, transcode HLS (ffmpeg) vào `chunk/`, lưu **object key** (tương đối) vào DB.

**Response 200**
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
> `hlsSkipped: true` + `coHls: false` khi máy không có ffmpeg (chỉ lưu video gốc, bỏ qua HLS).

**Ví dụ curl**
```bash
curl -X POST http://localhost:3000/api/baigiang/6/upload-video \
  -H "Authorization: Bearer <wstoken>" \
  -F "video=@bai1.mp4"
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

```
GET /api/baigiang/:id/playback-token
```
Yêu cầu đăng nhập LMS (Bearer wstoken). Trả token ký ngắn hạn (hết hạn `HLS_TOKEN_TTL`, mặc định `6h`) gắn với đúng `baiGiangId`.

**Response 200**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "url": "/api/baigiang/6/hls/index.m3u8?token=eyJhbGciOiJIUzI1NiJ9..."
}
```

**Lỗi:** `401` nếu chưa đăng nhập / token LMS hết hạn.

---

## 7. Stream HLS (playlist + segment)

```
GET /api/baigiang/:id/hls/:file?token=<token>
```
- `:file` = `index.m3u8` hoặc `seg_xxx.ts`
- `token` lấy từ mục 6. Playlist trả về đã tự gắn `?token=` cho từng segment, nên trình phát (hls.js) chỉ cần nạp `url` là chạy.

| Tình huống | HTTP |
|-----------|------|
| Thiếu token | `401` |
| Token sai / hết hạn | `401` |
| Token không khớp `:id` | `403` |
| File không tồn tại | `404` |
| OK | `200` (m3u8 hoặc luồng .ts) |

> Bucket private → **không** truy cập trực tiếp `http://localhost:9000/...` được (403). Mọi truy cập phải qua endpoint này.

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
```
