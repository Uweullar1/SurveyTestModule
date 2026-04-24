// src/proxyFetch.js

const originalFetch = window.fetch;

window.fetch = function (input, init) {
    let url;
    let options = init || {};

    if (typeof input === 'string') {
        url = input;
    } else if (input instanceof Request) {
        url = input.url;
        // Сохраняем method и body из Request
        if (!options.method) options.method = input.method;
        if (!options.body) options.body = input.body;
    } else {
        url = input.url || input.href;
    }

    // Если это URL Supabase - проксируем
    if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;
    }

    return originalFetch(url, options);
};