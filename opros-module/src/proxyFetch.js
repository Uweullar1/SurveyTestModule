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
        const reqHeaders = {};
        input.headers.forEach((val, key) => {
            if (!options.headers || !options.headers[key]) {
                reqHeaders[key] = val;
            }
        });
        options.headers = { ...reqHeaders, ...options.headers };
    } else {
        url = input.url || input.href;
    }

    // Проксируем ВСЁ что идет к supabase
    if (url.includes('vojascpwckvikdqlbfvy.supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;

    }

    return originalFetch(url, options);
};