import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
});

// Tự gắn JWT vào mọi request nếu có
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('moodle_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default http;
