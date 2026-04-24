export default async function handler(req, res) {
    // CORS заголовки
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vojascpwckvikdqlbfvy.supabase.co';
        const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

        // Получаем путь из URL
        let path = '';
        if (req.query.path) {
            path = Array.isArray(req.query.path)
                ? req.query.path.join('/')
                : req.query.path;
        }

        // Собираем все query параметры кроме 'path'
        const queryParams = new URLSearchParams();
        Object.keys(req.query).forEach(key => {
            if (key !== 'path') {
                queryParams.append(key, req.query[key]);
            }
        });

        const queryString = queryParams.toString();
        const fullPath = `/${path}${queryString ? `?${queryString}` : ''}`;
        const fullUrl = `${SUPABASE_URL}${fullPath}`;

        console.log('Proxy request:', {
            method: req.method,
            path: fullPath,
            fullUrl: fullUrl,
            hasAuth: !!req.headers.authorization,
            hasBody: !!req.body
        });

        // Подготавливаем заголовки
        const fetchHeaders = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
            'Content-Type': req.headers['content-type'] || 'application/json',
        };

        // Копируем важные заголовки из оригинального запроса
        if (req.headers.prefer) fetchHeaders['Prefer'] = req.headers.prefer;
        if (req.headers['x-client-info']) fetchHeaders['x-client-info'] = req.headers['x-client-info'];

        const fetchOptions = {
            method: req.method,
            headers: fetchHeaders,
        };

        // Добавляем body для не-GET запросов
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
            if (req.body) {
                fetchOptions.body = typeof req.body === 'string'
                    ? req.body
                    : JSON.stringify(req.body);
            }
        }

        // Делаем запрос к Supabase
        const response = await fetch(fullUrl, fetchOptions);

        // Получаем ответ
        const responseText = await response.text();

        // Копируем заголовки ответа
        const responseHeaders = response.headers;
        if (responseHeaders.get('content-type')) {
            res.setHeader('Content-Type', responseHeaders.get('content-type'));
        }
        if (responseHeaders.get('set-cookie')) {
            res.setHeader('Set-Cookie', responseHeaders.get('set-cookie'));
        }

        console.log('Proxy response:', {
            status: response.status,
            bodyPreview: responseText.substring(0, 100)
        });

        return res.status(response.status).send(responseText);

    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}