// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vojascpwckvikdqlbfvy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamFzY3B3Y2t2aWtkcWxiZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTYxNDksImV4cCI6MjA4ODQ5MjE0OX0.M6Se9csIMpeAvOBJzi2VH1VY1scAOtaE44HZ_FWUbAo'  // вставь свой реальный ключ из Supabase → Settings → API

// Кастомный fetch с прокси
const customFetch = async (input, init) => {
    let url;
    let options;

    if (input instanceof Request) {
        url = input.url;
        options = {
            method: input.method,
            headers: Object.fromEntries(input.headers.entries()),
            body: input.body
        };
    } else {
        url = typeof input === 'string' ? input : input.url;
        options = init || {};
    }

    // Заменяем URL Supabase на прокси
    if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
            }
        });

        return response;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    },
    global: {
        fetch: customFetch,
        headers: {
            'Content-Type': 'application/json',
        }
    }
});