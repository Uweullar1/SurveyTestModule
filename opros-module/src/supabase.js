// src/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vojascpwckvikdqlbfvy.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvamFzY3B3Y2t2aWtkcWxiZnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTYxNDksImV4cCI6MjA4ODQ5MjE0OX0.M6Se9csIMpeAvOBJzi2VH1VY1scAOtaE44HZ_FWUbAo'  // вставь свой реальный ключ из Supabase → Settings → API

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
        fetch: async (url, options) => {
            const urlObj = new URL(url);
            // Берем pathname и search отдельно
            const supabasePath = urlObj.pathname + urlObj.search;

            const proxyUrl = `${window.location.origin}/api/supabase-proxy${supabasePath}`;

            console.log('Original URL:', url);
            console.log('Proxy URL:', proxyUrl);

            return fetch(proxyUrl, options);
        },
    },
})