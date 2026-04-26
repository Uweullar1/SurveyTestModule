// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vojascpwckvikdqlbfvy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamFzY3B3Y2t2aWtkcWxiZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTYxNDksImV4cCI6MjA4ODQ5MjE0OX0.M6Se9csIMpeAvOBJzi2VH1VY1scAOtaE44HZ_FWUbAo'  // вставь свой реальный ключ из Supabase → Settings → API

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});
export const getAvatarUrl = (path) => {
    if (!path) return null
    // Если это уже полный URL с прокси — возвращаем как есть
    if (path.includes('/api/supabase-proxy')) return path
    // Иначе проксируем
    return `${window.location.origin}/api/supabase-proxy/storage/v1/object/public/${path}`
}