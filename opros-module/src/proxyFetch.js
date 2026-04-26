const originalFetch = window.fetch;

window.fetch = function (input, init) {
    let url;
    let options = { ...init };

    if (input instanceof Request) {
        url = input.url;
        options.method = options.method || input.method;
        if (input.body && !options.body) {
            options.body = input.body;
        }
        const reqHeaders = {};
        input.headers.forEach((val, key) => {
            if (!options.headers || !options.headers[key]) {
                reqHeaders[key] = val;
            }
        });
        options.headers = { ...reqHeaders, ...options.headers };
    } else if (typeof input === 'string') {
        url = input;
    } else {
        url = input.url || input.href;
    }

    // Проксируем ВСЕ запросы к Supabase, включая storage
    if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;
    }

    return originalFetch(url, options);
};