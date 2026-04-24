// /api/supabase-proxy.js (для Vercel)
export default async function handler(req, res) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    const response = await fetch(`${SUPABASE_URL}${req.url.replace('/api/supabase-proxy', '')}`, {
        method: req.method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    const data = await response.json();
    res.status(response.status).json(data);
}