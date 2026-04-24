export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vojascpwckvikdqlbfvy.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Формируем путь
    let path = '';
    if (req.query.path) {
        path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    }
    path = '/' + path;

    // Добавляем query параметры
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'path') {
            searchParams.append(key, value);
        }
    }
    const searchString = searchParams.toString();
    if (searchString) path += '?' + searchString;

    const targetUrl = `${SUPABASE_URL}${path}`;

    try {
        const fetchHeaders = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
            'Content-Type': req.headers['content-type'] || 'application/json',
            // ВАЖНО! Говорим Supabase не сжимать ответ
            'Accept-Encoding': 'identity',
        };

        if (req.headers.prefer) fetchHeaders['Prefer'] = req.headers.prefer;

        const fetchOptions = {
            method: req.method,
            headers: fetchHeaders,
            // Отключаем сжатие
            compress: false,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Получаем текст
        const responseText = await response.text();

        // Устанавливаем ТОЛЬКО нужные заголовки (без Content-Encoding)
        const allowedHeaders = [
            'content-type',
            'content-length',
            'date',
            'x-supabase-api-version'
        ];

        response.headers.forEach((value, key) => {
            if (allowedHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        // Явно указываем НЕ сжатый ответ
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');

        return res.status(response.status).send(responseText);

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({
            error: error.message,
            url: targetUrl
        });
    }
}