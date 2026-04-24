export default async function handler(req, res) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Берем путь либо из query (от vercel.json), либо из самого URL
    const queryPath = req.query.path;
    const urlPath = req.url.split('/api/supabase-proxy')[1];
    const path = queryPath ? `/${queryPath}` : (urlPath || '/');

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
            body: (req.method !== 'GET' && req.method !== 'HEAD')
                ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
                : undefined
        });

        const text = await response.text();
        try {
            const data = JSON.parse(text);
            return res.status(response.status).json(data);
        } catch (e) {
            return res.status(response.status).send(text);
        }
    } catch (error) {
        return res.status(500).json({ error: error.message, target: fullUrl });
    }
}