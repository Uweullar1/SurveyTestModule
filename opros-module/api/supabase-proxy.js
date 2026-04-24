export default async function handler(req, res) {
    console.log('Proxy called!', req.method, req.url);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vojascpwckvikdqlbfvy.supabase.co';
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Формируем путь к Supabase
    let path = '';
    if (req.query.path) {
        path = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
    }
    path = '/' + path;

    // Добавляем оригинальные query параметры (кроме path)
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'path') {
            searchParams.append(key, value);
        }
    }
    const searchString = searchParams.toString();
    if (searchString) path += '?' + searchString;

    const targetUrl = `${SUPABASE_URL}${path}`;

    console.log('Proxying to:', targetUrl);

    try {
        const response = await fetch(targetUrl, {
            method: req.method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
                'Content-Type': req.headers['content-type'] || 'application/json',
                'Prefer': req.headers.prefer || '',
            },
            body: req.method !== 'GET' && req.method !== 'HEAD' && req.body
                ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
                : undefined
        });

        const responseText = await response.text();

        console.log('Response status:', response.status);
        console.log('Response preview:', responseText.substring(0, 200));

        return res.status(response.status).send(responseText);

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({
            error: error.message,
            url: targetUrl
        });
    }
}