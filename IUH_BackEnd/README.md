# IUH_BackEnd

Backend API: **Node.js + Express + SQL Server (mssql)**.

## Cấu trúc thư mục

```
IUH_BackEnd/
├── src/
│   ├── config/         # Cấu hình (kết nối DB...)
│   │   └── db.js
│   ├── controllers/    # Xử lý request/response
│   ├── routes/         # Định nghĩa route
│   ├── models/         # Truy vấn / mô hình dữ liệu
│   ├── middlewares/    # Middleware (auth, error handler...)
│   ├── services/       # Logic nghiệp vụ
│   ├── utils/          # Hàm tiện ích
│   ├── app.js          # Khởi tạo express app
│   └── server.js       # Điểm khởi động (entry point)
├── .env                # Biến môi trường (KHÔNG commit)
├── .env.example
├── .gitignore
└── package.json
```

## Cài đặt

```bash
npm install
```

## Cấu hình `.env`

Sao chép `.env.example` thành `.env` rồi điền thông tin SQL Server:

```
PORT=3000
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=IUH_DB
DB_USER=sa
DB_PASSWORD=YourStrong@Passw0rd
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
JWT_SECRET=...
```

## Chạy

```bash
npm run dev    # development (nodemon)
npm start      # production
```

Kiểm tra: `GET http://localhost:3000/health` và `GET http://localhost:3000/api/examples`
