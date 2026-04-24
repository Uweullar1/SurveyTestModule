export default async function handler(req, res) {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey, Prefer');

    // Обработка preflight запросов
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vojascpwckvikdqlbfvy.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        return res.status(500).json({ error: 'Missing Supabase configuration' });
    }

    // Получаем путь из query параметров
    const path = req.query.path || '';
    const fullUrl = `${SUPABASE_URL}/${path}`;

    console.log('Proxying to:', fullUrl); // Для отладки

    try {
        // Собираем заголовки для Supabase
        const headers = {
            'apikey': SUPABASE_KEY,
            'Content-Type': req.headers['content-type'] || 'application/json',
        };

        // Добавляем авторизацию, если она есть в запросе
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        } else {
            headers['Authorization'] = `Bearer ${SUPABASE_KEY}`;
        }

        // Добавляем Prefer если есть
        if (req.headers.prefer) {
            headers['Prefer'] = req.headers.prefer;
        }

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        // Добавляем body только для методов, которые его поддерживают
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string'
                ? req.body
                : JSON.stringify(req.body);
        }

        const response = await fetch(fullUrl, fetchOptions);

        // Получаем ответ как текст
        const text = await response.text();

        // Пробуем распарсить как JSON
        try {
            const data = JSON.parse(text);
            return res.status(response.status).json(data);
        } catch (e) {
            // Если не JSON, отправляем как есть
            return res.status(response.status).send(text);
        }
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({
            error: error.message,
            target: fullUrl
        });
    }
}