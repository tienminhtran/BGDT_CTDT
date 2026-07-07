import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                // target: 'http://localhost:3000',
                // target: 'http://192.168.110.49:3000',
                target: 'http://test.iuh.edu.vn:3000',
                changeOrigin: true,
            }
        }
    },
    preview: {
        host: '0.0.0.0',
        port: 3002,
        strictPort: true,
    }
})
