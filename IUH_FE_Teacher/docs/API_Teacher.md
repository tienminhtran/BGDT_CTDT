# API Xem Video — App Giảng Viên (IUH_FE_Teacher)

App giảng viên **không đăng nhập**. Mọi quyền truy cập dựa trên **key giảng viên**
`KEY_LOGIN_TEACHER`, được axios gắn sẵn vào **mọi request** qua header `x-teacher-key`
(xem [src/api/http.js](../src/api/http.js)).

- **Base URL:** `/api` (cấu hình `VITE_API_BASE_URL`, dev proxy sang `http://localhost:3000`)
- **Key giảng viên (frontend):** `VITE_TEACHER_KEY` phải **khớp** `KEY_LOGIN_TEACHER` của backend.

| Header | Giá trị | Dùng cho |
|---|---|---|
| `x-teacher-key` | `KEY_LOGIN_TEACHER` | Xem video (bắt buộc ở bước lấy playback-token) |
| `x-api-key` | `UPLOAD_API_KEY` | **Chỉ** dùng khi upload video (xem [API_QuanLyBaiGiang.md](./API_QuanLyBaiGiang.md)) |

> 📤 **Upload & quản lý bài giảng** (chọn môn, xem chương, tải video) ở tài liệu riêng:
> [API_QuanLyBaiGiang.md](./API_QuanLyBaiGiang.md).

---

## Luồng xem video (3 bước + stream)

```
[courseCode + version]
      │  (1) POST /lectures/token
      ▼
   token mờ ──(2) GET /lectures?course=token──► danh sách video (baiGiangId, coHls...)
                                                      │ (3) GET /lectures/:id/playback-token
                                                      ▼
                                                 { token, url } ──► (4) stream HLS
```

---

### 1) Tạo token khóa học

Mã hóa `mã môn + phiên bản` thành token mờ (không lộ mã môn trên URL).

- **Method:** `POST`
- **URL:** `/api/lectures/token`
- **Headers:** `x-teacher-key: <KEY_LOGIN_TEACHER>` *(gửi sẵn tự động)*
- **Body (JSON):**

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `courseCode` | string | ✅ | Mã môn (`ma_tuquan`), vd `2101420` |
| `version` | string \| null | ❌ | Phiên bản, vd `1`. Bỏ trống = mọi phiên bản |

- **Response:** `{ "token": "<chuỗi mờ>" }`
- **Frontend:** `baiGiangService.createCourseToken(courseCode, version)`

```js
// Ví dụ
const token = await createCourseToken('2101420', '1')
```

---

### 2) Lấy danh sách video theo token

- **Method:** `GET`
- **URL:** `/api/lectures?course=<token>`
- **Headers:** `x-teacher-key` *(gửi sẵn tự động)*
- **Query:**

| Trường | Bắt buộc | Mô tả |
|---|---|---|
| `course` | ✅ | Token mờ lấy ở bước 1 |

- **Response:**

```json
{
  "subjectName": "Công nghệ phần mềm",
  "version": "1",
  "videos": [
    {
      "baiGiangId": 1002,
      "chiTietId": 55,
      "noiDungChuong": "Chương 1: Tổng quan về Công nghệ phần mềm",
      "tenBaiGiang": "Bài 1",
      "version": "1",
      "coVideo": true,
      "coHls": true
    }
  ]
}
```

| Trường (mỗi video) | Mô tả |
|---|---|
| `baiGiangId` | ID bài giảng — dùng cho bước 3 |
| `coVideo` | Đã có video gốc chưa |
| `coHls` | Đã có bản phát HLS chưa (chỉ phát được khi `true`) |

- **Frontend:** `baiGiangService.getDanhSachVideo(token)`

---

### 3) Lấy token phát HLS (playback-token)

> 🔑 **Bước cần key giảng viên.** Không có `x-teacher-key` hợp lệ → `401 { "message": "Chưa đăng nhập" }`.

- **Method:** `GET`
- **URL:** `/api/lectures/:baiGiangId/playback-token`
- **Headers:** `x-teacher-key: <KEY_LOGIN_TEACHER>` *(gửi sẵn tự động)*
- **Response:**

```json
{
  "token": "<jwt ký ngắn hạn>",
  "url": "/api/lectures/1002/hls/index.m3u8?token=<jwt>"
}
```

- Token HLS hết hạn theo `HLS_TOKEN_TTL` của backend (mặc định `6h`).
- **Frontend:** `baiGiangService.getPlaybackToken(baiGiangId)` → trả về `url`.

---

### 4) Stream HLS (trình phát tự gọi)

`HlsPlayer` nhận `url` ở bước 3 và tự tải playlist + segment:

- **Method:** `GET`
- **URL:** `/api/lectures/:baiGiangId/hls/index.m3u8?token=<jwt>` (và các `*.ts`)
- **Auth:** bằng `token` ký trên query — **không** cần `x-teacher-key` cho từng segment.

---

## Tóm tắt: "cần truyền gì để xem video?"

1. **`x-teacher-key`** = `KEY_LOGIN_TEACHER` → đã gắn tự động ở mọi request.
2. **`courseCode` (+ `version`)** → để tạo token (bước 1).
3. **`baiGiangId`** → để xin playback-token (bước 3).

Trên app, chỉ cần gọi `moTrangVideo(maMon, version)` (trang Quản lý bài giảng) là chạy
hết chuỗi trên; phần token HLS do `HlsPlayer` xử lý.
