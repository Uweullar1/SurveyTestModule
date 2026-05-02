const originalFetch = window.fetch;

window.fetch = function (input, init) {
    let url;
    let options = init || {};

    if (typeof input === 'string') {
        url = input;
    } else if (input instanceof Request) {
        url = input.url;
        if (!options.method) options.method = input.method;
        if (!options.body) options.body = input.body;
    } else {
        url = input.url || input.href;
    }

    // Проксируем ВСЕ запросы к supabase (включая storage!)
    if (url.includes('vojascpwckvikdqlbfvy.supabase.co') || url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;

        // Для FormData не трогаем Content-Type
        if (options.body instanceof FormData) {
            if (options.headers) {
                const cleanHeaders = {};
                for (const key in options.headers) {
                    if (key.toLowerCase() !== 'content-type') {
                        cleanHeaders[key] = options.headers[key];
                    }
                }
                options.headers = cleanHeaders;
            }
        }
    }

    return originalFetch(url, options);
};