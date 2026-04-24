import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue()],
    server: {
        proxy: {
            '/api/supabase-proxy': {
                target: 'https://vojascpwckvikdqlbfvy.supabase.co/', // Добавь слеш в конце
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/api\/supabase-proxy/, ''),
                // Это оставит всё, что идет ПОСЛЕ префикса (например, /auth/v1/signup)
            }
        }
    
    }
})
