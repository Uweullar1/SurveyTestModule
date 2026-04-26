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

    const url = new URL(req.url, `http://${req.headers.host}`);
    let path = url.pathname.replace('/api/supabase-proxy', '') + url.search;
    if (!path || path === '/') path = '/';

    const targetUrl = `${SUPABASE_URL}${path}`;
    const isStorageRequest = path.includes('/storage/');

    try {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
        };

        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }
        if (req.headers.prefer) headers['Prefer'] = req.headers.prefer;

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        const responseContentType = response.headers.get('content-type') || '';

        // Для изображений — бинарный ответ
        if (isStorageRequest && responseContentType.includes('image/')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', responseContentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.status(response.status).send(Buffer.from(buffer));
        }

        // Для всего остального — текст
        const text = await response.text();
        res.setHeader('Content-Type', responseContentType || 'application/json');
        return res.status(response.status).send(text);

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}