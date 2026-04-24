export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SUPABASE_URL = 'https://vojascpwckvikdqlbfvy.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Получаем путь
    const url = new URL(req.url, `http://${req.headers.host}`);
    let path = url.pathname.replace('/api/supabase-proxy', '') + url.search;
    if (!path) path = '/';

    const targetUrl = `${SUPABASE_URL}${path}`;

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
                'Content-Type': req.headers['content-type'] || 'application/json',
                'Prefer': req.headers.prefer || '',
                'x-upsert': req.headers['x-upsert'] || '',
            },
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
        });

        const buffer = await response.arrayBuffer();

        // Устанавливаем заголовки
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
        res.setHeader('Content-Length', response.headers.get('content-length') || buffer.byteLength);

        return res.status(response.status).send(Buffer.from(buffer));
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}