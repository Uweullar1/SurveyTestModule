export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
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
    if (!path || path === '/') path = '/';

    const targetUrl = `${SUPABASE_URL}${path}`;

    console.log('Proxy to:', targetUrl, 'Method:', req.method);

    try {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
        };

        // Копируем Content-Type как есть
        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }

        // Копируем другие важные заголовки
        if (req.headers.prefer) headers['Prefer'] = req.headers.prefer;
        if (req.headers['x-upsert']) headers['x-upsert'] = req.headers['x-upsert'];

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        // ВАЖНО: Передаем body как есть для PATCH, POST, PUT
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            if (req.body) {
                // Тело уже распаршено Vercel, отправляем как JSON
                fetchOptions.body = JSON.stringify(req.body);
                headers['Content-Type'] = 'application/json';
            }
        }

        const response = await fetch(targetUrl, fetchOptions);

        const contentType = response.headers.get('content-type') || 'application/json';
        const buffer = await response.arrayBuffer();

        res.setHeader('Content-Type', contentType);

        return res.status(response.status).send(Buffer.from(buffer));

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}