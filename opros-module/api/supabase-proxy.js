export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

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
        };

        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }
        if (req.headers.prefer) headers['Prefer'] = req.headers.prefer;
        if (req.headers['x-upsert']) headers['x-upsert'] = req.headers['x-upsert'];

        let body = undefined;

        if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            // Для файлов — собираем сырой body
            const chunks = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            body = Buffer.concat(chunks);
        }

        const response = await fetch(targetUrl, {
            method: req.method,
            headers: headers,
            body: body,
        });

        const responseBuffer = await response.arrayBuffer();

        response.headers.forEach((value, key) => {
            if (!['transfer-encoding', 'connection', 'content-encoding'].includes(key.toLowerCase())) {
                res.setHeader(key, value);
            }
        });

        return res.status(response.status).send(Buffer.from(responseBuffer));

    } catch (error) {
        console.error('Proxy error:', error.message);
        return res.status(500).json({ error: error.message, url: targetUrl });
    }
}