// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vojascpwckvikdqlbfvy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamFzY3B3Y2t2aWtkcWxiZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTYxNDksImV4cCI6MjA4ODQ5MjE0OX0.M6Se9csIMpeAvOBJzi2VH1VY1scAOtaE44HZ_FWUbAo'  // вставь свой реальный ключ из Supabase → Settings → API

const customFetch = async (url, options = {}) => {
    // Всегда используем прокси
    const urlString = typeof url === 'string' ? url : url.toString();
    const urlObj = new URL(urlString);

    // Берем путь после домена Supabase
    const pathWithQuery = urlObj.pathname + urlObj.search;
    const proxyUrl = `${window.location.origin}/api/supabase-proxy${pathWithQuery}`;

    console.log('Fetching through proxy:', {
        original: urlString,
        proxy: proxyUrl,
        method: options.method || 'GET'
    });

    try {
        const response = await fetch(proxyUrl, {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
            }
        });

        // Логируем ответ для отладки
        const clone = response.clone();
        clone.text().then(text => {
            console.log('Response:', {
                status: response.status,
                ok: response.ok,
                bodyPreview: text.substring(0, 100)
            });
        });

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    global: {
        fetch: customFetch
    }
})