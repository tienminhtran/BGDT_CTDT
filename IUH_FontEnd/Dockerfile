# ===== Frontend: build Vite/React rồi phục vụ bằng nginx =====

# --- Giai đoạn build ---
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# API_BASE_URL mặc định '/api' -> nginx proxy sang backend (không cần đổi).
# Có thể override khi build nếu muốn gọi backend ở domain khác.
ARG VITE_API_BASE_URL=/api
ARG VITE_LMS_BASE_URL=https://lms.iuh.edu.vn
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_LMS_BASE_URL=$VITE_LMS_BASE_URL

RUN npm run build

# --- Giai đoạn chạy ---
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
