import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
                name: 'Tên App Đầy Đủ',
                short_name: 'App',
                description: 'Mô tả ngắn gọn',
                theme_color: '#000000',
                background_color: '#ffffff',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                icons: [
                    { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
                    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
                cleanupOutdatedCaches: true,
                runtimeCaching: [
                    {
                        // Cache API riêng cho path /api mà server bạn proxy tới
                        urlPattern: /^\/api\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            networkTimeoutSeconds: 5,
                            expiration: { maxEntries: 100, maxAgeSeconds: 60 * 5 },
                            cacheableResponse: { statuses: [0, 200] }
                        }
                    },
                    {
                        urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'image-cache',
                            expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
                        }
                    }
                ]
            },
            devOptions: {
                enabled: true // bật SW khi npm run dev để test luôn
            }
        })
    ],
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                // target: 'http://localhost:3000',
                target: 'http://192.168.110.49:3000',
                // target: 'http://test.iuh.edu.vn:3000',
                changeOrigin: true,
            }
        }
    },
    preview: {
        host: '0.0.0.0',
        port: 3001,
        strictPort: true,
    }
})