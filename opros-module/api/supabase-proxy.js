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
        // Базовые заголовки
        const fetchHeaders = {
            'apikey': SUPABASE_KEY,
            'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
            'Accept-Encoding': 'identity',
        };

        // Для загрузки файлов НЕ ставим Content-Type: application/json
        if (req.headers['content-type'] &&
            req.headers['content-type'].includes('multipart/form-data')) {
            // Для файлов - не трогаем Content-Type
            fetchHeaders['Content-Type'] = req.headers['content-type'];
        } else {
            fetchHeaders['Content-Type'] = req.headers['content-type'] || 'application/json';
        }

        if (req.headers.prefer) fetchHeaders['Prefer'] = req.headers.prefer;
        if (req.headers['x-upsert']) fetchHeaders['x-upsert'] = req.headers['x-upsert'];

        const fetchOptions = {
            method: req.method,
            headers: fetchHeaders,
            compress: false,
        };

        // Body - для файлов передаем как есть, для JSON - строкой
        if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);

        // Для бинарных данных (storage) - возвращаем как буфер
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('image/') ||
            contentType.includes('application/octet-stream') ||
            path.includes('/storage/')) {
            // Бинарный ответ - получаем как буфер
            const buffer = await response.arrayBuffer();
            const bufferBase64 = Buffer.from(buffer).toString('base64');

            // Копируем заголовки
            response.headers.forEach((value, key) => {
                if (!['transfer-encoding', 'connection', 'keep-alive', 'content-encoding'].includes(key.toLowerCase())) {
                    res.setHeader(key, value);
                }
            });

            return res.status(response.status).send(Buffer.from(bufferBase64, 'base64'));
        } else {
            // Текстовый ответ (JSON)
            const responseText = await response.text();

            // Копируем заголовки
            response.headers.forEach((value, key) => {
                if (!['transfer-encoding', 'connection', 'keep-alive', 'content-encoding'].includes(key.toLowerCase())) {
                    res.setHeader(key, value);
                }
            });

            return res.status(response.status).send(responseText);
        }

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({
            error: error.message,
            url: targetUrl
        });
    }
}