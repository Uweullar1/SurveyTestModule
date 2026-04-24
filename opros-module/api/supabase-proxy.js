// /api/supabase-proxy.js (для Vercel)
export default async function handler(req, res) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Склеиваем правильный адрес для Supabase
    const path = req.url.replace('/api/supabase-proxy', '') || '/';
    const fullUrl = `${SUPABASE_URL}${path}`;

    try {
        const response = await fetch(fullUrl, {
            method: req.method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            // Передаем тело запроса, если это не GET
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}