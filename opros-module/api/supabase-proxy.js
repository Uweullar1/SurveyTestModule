export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Формируем путь
    let path = req.query.path || '';

    // Если path это массив, объединяем
    if (Array.isArray(path)) {
        path = path.join('/');
    }

    // Добавляем query параметры если они есть (важно!)
    const queryString = Object.keys(req.query)
        .filter(key => key !== 'path')
        .map(key => `${key}=${req.query[key]}`)
        .join('&');

    let fullPath = path ? `/${path}` : '';
    if (queryString) {
        fullPath += `?${queryString}`;
    }

    const fullUrl = `${SUPABASE_URL}${fullPath}`;

    console.log('Path:', path);
    console.log('Query string:', queryString);
    console.log('Full URL:', fullUrl);

    try {
        const headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
            'Content-Type': req.headers['content-type'] || 'application/json',
        };

        if (req.headers.prefer) {
            headers['Prefer'] = req.headers.prefer;
        }

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string'
                ? req.body
                : JSON.stringify(req.body);
        }

        const response = await fetch(fullUrl, fetchOptions);
        const data = await response.text();

        // Пробуем установить правильный content-type от Supabase
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        return res.status(response.status).send(data);
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({
            error: error.message,
            url: fullUrl
        });
    }
}