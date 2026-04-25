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

    try {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
        };

        // Копируем Content-Type (важно для multipart/form-data с boundary!)
        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }

        if (req.headers.prefer) headers['Prefer'] = req.headers.prefer;
        if (req.headers['x-upsert']) headers['x-upsert'] = req.headers['x-upsert'];

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        // Передаем body
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body) {
            // Для FormData/файлов - передаем как сырые данные
            if (typeof req.body === 'string') {
                fetchOptions.body = req.body;
            } else {
                fetchOptions.body = JSON.stringify(req.body);
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }
            }
        }

        const response = await fetch(targetUrl, fetchOptions);

        const buffer = await response.arrayBuffer();

        // Копируем заголовки ответа
        response.headers.forEach((value, key) => {
            if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        return res.status(response.status).send(Buffer.from(buffer));

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({ error: error.message });
    }
}