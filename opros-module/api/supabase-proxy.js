export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

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
            'Prefer': req.headers.prefer || 'return=representation',
        };

        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        // Передаем body для POST/PATCH/PUT
        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.body) {
            fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        const text = await response.text();

        res.setHeader('Content-Type', 'application/json');
        return res.status(response.status).send(text);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}