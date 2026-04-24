export default async function handler(req, res) {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

    // 1. Очищаем путь. Убираем /api/supabase-proxy, чтобы осталось /auth/v1/... или /rest/v1/...
    let path = req.url.replace('/api/supabase-proxy', '');

    // Если путь пустой (как при твоей проверке), не даем ошибку, а просто пишем статус
    if (!path || path === '/') {
        return res.status(200).json({ status: "Proxy is online", target: SUPABASE_URL });
    }

    const fullUrl = `${SUPABASE_URL}${path}`;

    try {
        const response = await fetch(fullUrl, {
            method: req.method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': req.headers.authorization || `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': req.headers.prefer || ''
            },
            // Если тело уже объект (Vercel это делает сам), превращаем в строку.
            // Если тела нет — оставляем undefined.
            body: (req.method !== 'GET' && req.method !== 'HEAD')
                ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))
                : undefined
        });

        // Пытаемся получить данные. Если Supabase вернул не JSON, берем как текст
        const text = await response.text();
        try {
            const data = JSON.parse(text);
            res.status(response.status).json(data);
        } catch (e) {
            res.status(response.status).send(text);
        }
    } catch (error) {
        res.status(500).json({ error: error.message, details: "Check SUPABASE_URL environment variable" });
    }
}