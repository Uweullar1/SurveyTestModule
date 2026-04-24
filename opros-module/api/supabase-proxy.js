export default async function handler(req, res) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Отрезаем всё, что до /rest/v1 или /auth/v1
    const path = req.url.split('/api/supabase-proxy')[1] || '/';
    const fullUrl = `${SUPABASE_URL}${path}`;

    try {
        const response = await fetch(fullUrl, {
            method: req.method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': req.headers.prefer || ''
            },
            body: (req.method !== 'GET' && req.method !== 'HEAD') ? JSON.stringify(req.body) : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}