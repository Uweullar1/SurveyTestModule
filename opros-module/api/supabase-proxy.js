export default async function handler(req, res) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // Улучшенная очистка пути: убираем всё до начала запроса к Supabase
    let path = req.url.split('/api/supabase-proxy')[1] || '/';

    // Убираем возможные двойные слеши
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const fullUrl = `${SUPABASE_URL}${cleanPath}`;

    try {
        const response = await fetch(fullUrl, {
            method: req.method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': req.headers.prefer || ''
            },
            body: (req.method !== 'GET' && req.method !== 'HEAD')
                ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
                : undefined
        });

        // Безопасное чтение ответа
        const text = await response.text();
        res.setHeader('Content-Type', 'application/json');

        try {
            const data = JSON.parse(text);
            return res.status(response.status).json(data);
        } catch (e) {
            // Если Supabase вернул не JSON (например, ошибку), отправляем как есть
            return res.status(response.status).send(text);
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}