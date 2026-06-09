# ===== Backend: Node.js + Express + ffmpeg (HLS) =====
FROM node:20-bookworm-slim

# ffmpeg dùng để chuyển video gốc -> HLS (index.m3u8 + .ts)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cài dependencies (tận dụng cache; chỉ chạy lại khi package*.json đổi)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy mã nguồn
COPY . .

ENV NODE_ENV=production \
    PORT=3000 \
    FFMPEG_PATH=/usr/bin/ffmpeg

EXPOSE 3000

CMD ["node", "src/server.js"]
