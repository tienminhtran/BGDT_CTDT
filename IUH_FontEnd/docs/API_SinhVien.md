# API — App Sinh Viên (IUH_FontEnd)

App sinh viên **đăng nhập bằng tài khoản LMS (Moodle)**. Sau khi đăng nhập, backend trả
một **`wstoken`** dùng làm phiên; client gửi kèm ở header `Authorization: Bearer <wstoken>`
cho mọi request (xem [src/api/http.js](../src/api/http.js)).

- **Base URL:** `/api` (cấu hình `VITE_API_BASE_URL`, dev proxy sang `http://localhost:3000`)
- **Xác thực:** `Authorization: Bearer <wstoken>` — gắn tự động từ `localStorage`.
- **Phiên:** tối đa **2 giờ** kể từ lúc login (`SESSION_MAX_AGE_MS`), quá hạn tự đăng xuất.

| Header | Giá trị | Dùng cho |
|---|---|---|
| `Authorization` | `Bearer <wstoken>` | Hầu hết request (login & xem thống kê đánh giá thì không bắt buộc) |

---

## 1) Đăng nhập & phiên

### Đăng nhập
- **Method:** `POST`
- **URL:** `/api/auth/login`
- **Body (JSON):**

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `username` | string | ✅ | MSSV / tài khoản LMS |
| `password` | string | ✅ | Mật khẩu LMS |

- **Response:**

```json
{
  "token": "<wstoken>",
  "user": { "moodleId": 123, "username": "21001234", "fullname": "Nguyễn Văn A" }
}
```

- **Frontend:** `authService.login(username, password)` → lưu `token` + `loginAt` vào localStorage.

### Kiểm tra phiên còn sống
- **Method:** `GET`
- **URL:** `/api/auth/me`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Response:** `{ "user": { "moodleId", "username", "fullname" } }`
- **401** nếu token thiếu/hết hạn → app tự đăng xuất.
- **Frontend:** `authService.getCurrentUser()`

---

## 2) Đồng bộ & danh sách khóa học

### Import học phần (chạy nền sau login)
- **Method:** `POST`
- **URL:** `/api/student-courses/import`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Response:** `{ "mssv": "21001234", ... }`
- **Frontend:** `sinhVienHocPhanService.importHocPhan()`

### Danh sách khóa học LMS của sinh viên
- **Method:** `GET`
- **URL:** `/api/courses`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Response:** `{ "courses": [ ... ] }`
- **Frontend:** `courseService.getMyCourses()`

---

## 3) Vào xem bài giảng

### Tạo token khóa học (ẩn mã môn trên URL)
- **Method:** `POST`
- **URL:** `/api/lectures/token`
- **Body (JSON):**

| Trường | Kiểu | Bắt buộc | Mô tả |
|---|---|---|---|
| `courseCode` | string | ✅ | Mã môn (`ma_tuquan`) |
| `version` | string \| null | ❌ | Phiên bản; bỏ trống = mọi phiên bản |

- **Response:** `{ "token": "<chuỗi mờ>" }`
- **Frontend:** `baiGiangService.createCourseToken(courseCode, version)`
- URL trang xem: `/bai-giang-dien-tu/<token>`

### Kiểm tra quyền học khóa
> 🔒 Bắt buộc đăng nhập. Trả `allowed=false` nếu khóa không thuộc học phần của SV.

- **Method:** `GET`
- **URL:** `/api/student-courses/access?course=<token>`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Response:** `{ "allowed": true }`
- **Frontend:** `sinhVienHocPhanService.kiemTraQuyen(token)`

### Danh sách video theo token
- **Method:** `GET`
- **URL:** `/api/lectures?course=<token>`
- **Response:**

```json
{
  "subjectName": "Công nghệ phần mềm",
  "version": "1",
  "videos": [
    {
      "baiGiangId": 1002,
      "chiTietId": 55,
      "noiDungChuong": "Chương 1: ...",
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
| `baiGiangId` | ID bài giảng — dùng cho playback-token & đánh giá |
| `coHls` | Chỉ phát được khi `true` |

- **Frontend:** `baiGiangService.getDanhSachVideo(token)`

### Lấy token phát HLS
- **Method:** `GET`
- **URL:** `/api/lectures/:baiGiangId/playback-token`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Response:** `{ "token": "<jwt>", "url": "/api/lectures/:id/hls/index.m3u8?token=<jwt>" }`
- Token HLS hết hạn theo `HLS_TOKEN_TTL` (mặc định `6h`).
- **Frontend:** `baiGiangService.getPlaybackToken(baiGiangId)` → trả `url`.

### Stream HLS (trình phát tự gọi)
- **URL:** `/api/lectures/:baiGiangId/hls/index.m3u8?token=<jwt>` (và các `*.ts`)
- Xác thực bằng `token` ký trên query — không cần `Authorization` cho từng segment.

---

## 4) Đánh giá & bình luận

### Xem thống kê đánh giá (công khai)
- **Method:** `GET`
- **URL:** `/api/reviews/:lectureId`
- **Response:** `{ "lectureId": 1002, "total": 12, "average": 4.5, "distribution": { ... } }`
- **Frontend:** `danhGiaService.getDanhGia(lectureId)`

### Đánh giá của chính SV (prefill form)
- **Method:** `GET`
- **URL:** `/api/reviews/:lectureId/mine`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Response:** `{ "lectureId": 1002, "review": { "stars": 5, "comment": "...", "createdAt": "..." } | null }`
- **Frontend:** `danhGiaService.getDanhGiaCuaToi(lectureId)`

### Tạo đánh giá
- **Method:** `POST`
- **URL:** `/api/reviews/:lectureId`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Body:** `{ "stars": 1..5, "comment": "string | null" }`
- **Response (201):** `{ "message": "Đánh giá thành công", "review": { ... } }`
- **Frontend:** `danhGiaService.taoDanhGia(lectureId, { stars, comment })`

### Sửa đánh giá
- **Method:** `PUT`
- **URL:** `/api/reviews/:lectureId`
- **Headers:** `Authorization: Bearer <wstoken>`
- **Body:** `{ "stars"?: 1..5, "comment"?: "string | null" }`
- **Response:** `{ "message": "Cập nhật đánh giá thành công", "review": { ... } }`
- **Frontend:** `danhGiaService.suaDanhGia(lectureId, { stars, comment })`

---

## Mã lỗi thường gặp

| Mã | Ý nghĩa |
|---|---|
| `400` | Thiếu/sai tham số (vd token khóa học không hợp lệ) |
| `401` | Chưa đăng nhập hoặc `wstoken` hết hạn → app tự đăng xuất |
| `403` | Token HLS không khớp bài giảng |

---

## Tóm tắt luồng chính

```
login ─► (lưu wstoken) ─► /courses ─► /lectures/token ─► /student-courses/access
   │                                                            │ allowed
   ▼                                                            ▼
 /auth/me (giữ phiên)                         /lectures?course=token ─► /lectures/:id/playback-token ─► stream HLS
                                                                                   │
                                                                                   ▼
                                                                  /reviews/:id  (xem + chấm sao + bình luận)
```

> So sánh với app giảng viên: app giảng viên **không đăng nhập**, dùng header `x-teacher-key`
> (`KEY_LOGIN_TEACHER`) thay cho `Bearer wstoken`. Xem `IUH_FE_Teacher/docs/API_XemVideo.md`.
