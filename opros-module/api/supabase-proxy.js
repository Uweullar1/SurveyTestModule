export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SUPABASE_URL = 'https://vojascpwckvikdqlbfvy.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    const url = new URL(req.url, `http://${req.headers.host}`);
    let path = url.pathname.replace('/api/supabase-proxy', '') + url.search;
    if (!path || path === '/') path = '/';

    const targetUrl = `${SUPABASE_URL}${path}`;

    try {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
        };

        // Для загрузки файлов важно передать правильный Content-Type
        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }
        if (req.headers.prefer) headers['Prefer'] = req.headers.prefer;
        if (req.headers['x-upsert']) headers['x-upsert'] = req.headers['x-upsert'];
        // Важно для загрузки файлов
        if (req.headers['cache-control']) headers['Cache-Control'] = req.headers['cache-control'];
        if (req.headers['content-length']) headers['Content-Length'] = req.headers['content-length'];

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        // Для запросов с телом
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            if (req.body) {
                // Если это строка (JSON) - передаем как есть
                if (typeof req.body === 'string') {
                    fetchOptions.body = req.body;
                }
                // Если это объект (распаршенный JSON) - преобразуем обратно
                else if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
                    fetchOptions.body = JSON.stringify(req.body);
                    headers['Content-Type'] = 'application/json';
                }
                // Если это Buffer или что-то еще - передаем как есть
                else {
                    fetchOptions.body = req.body;
                }
            }
        }

        const response = await fetch(targetUrl, fetchOptions);

        const contentType = response.headers.get('content-type') || '';

        // Для изображений возвращаем бинарные данные
        if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
            const buffer = await response.arrayBuffer();
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
            return res.status(response.status).send(Buffer.from(buffer));
        }

        // Для всего остального
        const text = await response.text();
        res.setHeader('Content-Type', contentType || 'application/json');
        return res.status(response.status).send(text);

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ error: error.message });
    }
}