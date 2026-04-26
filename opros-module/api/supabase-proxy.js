export default async function handler(req, res) {
    // CORS заголовки для всех
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'content-type, content-length, content-range');

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

        // Копируем нужные заголовки
        if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
        if (req.headers.prefer) headers['Prefer'] = req.headers.prefer;

        // Для GET запросов изображений не шлем Content-Type
        if (req.method === 'GET') {
            delete headers['Content-Type'];
        }

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Получаем тип контента
        const contentType = response.headers.get('content-type') || 'application/json';

        // Для изображений и файлов - возвращаем бинарный ответ
        if (contentType.includes('image/') ||
            contentType.includes('application/pdf') ||
            contentType.includes('application/octet-stream') ||
            path.includes('/storage/v1/object/')) {

            const buffer = await response.arrayBuffer();

            // Устанавливаем правильные заголовки для кеширования
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('Content-Length', buffer.byteLength);

            return res.status(response.status).send(Buffer.from(buffer));
        }

        // Для JSON ответов
        const text = await response.text();
        res.setHeader('Content-Type', contentType);

        return res.status(response.status).send(text);

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}