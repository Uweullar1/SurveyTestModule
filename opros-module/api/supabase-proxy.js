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

    // Добавляем query параметры (кроме path)
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
        // Заголовки запроса к Supabase
        const fetchHeaders = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
            'Content-Type': req.headers['content-type'] || 'application/json',
        };

        if (req.headers.prefer) fetchHeaders['Prefer'] = req.headers.prefer;
        if (req.headers['x-client-info']) fetchHeaders['x-client-info'] = req.headers['x-client-info'];

        const fetchOptions = {
            method: req.method,
            headers: fetchHeaders,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Копируем ВСЕ заголовки ответа
        response.headers.forEach((value, key) => {
            // Не копируем проблемные заголовки
            if (!['transfer-encoding', 'connection', 'keep-alive'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        // Получаем тело ответа
        const responseText = await response.text();

        // Отправляем ответ с правильным статусом
        return res.status(response.status).send(responseText);

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({
            error: error.message,
            url: targetUrl
        });
    }
}