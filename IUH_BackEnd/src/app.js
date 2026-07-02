const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares
// HLS xác thực bằng cookie HttpOnly -> phải bật credentials và echo đúng origin
// (Access-Control-Allow-Origin '*' + credentials không được phép theo spec CORS).
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// API routes
app.use('/api', routes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Không tìm thấy tài nguyên' });
});

// Error handler (đặt cuối cùng)
app.use(errorHandler);

module.exports = app;
