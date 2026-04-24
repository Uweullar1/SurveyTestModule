import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        }
    },
    server: {
        proxy: {
            '/api/supabase-proxy': {
                target: 'https://vojascpwckvikdqlbfvy.supabase.co',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/supabase-proxy/, ''),
            }
        }
    }
})