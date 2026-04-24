// src/proxyFetch.js
// Переопределяем глобальный fetch для проксирования запросов к Supabase

const originalFetch = window.fetch;

window.fetch = async function (input, init) {
    let url = typeof input === 'string' ? input :
        input instanceof Request ? input.url :
            input instanceof URL ? input.href : input;

    let options = init || {};

    // Если это URL Supabase - проксируем
    if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;

        console.log('Proxy fetch:', url);
    }

    return originalFetch.call(window, url, options);
};

// Также переопределяем для XMLHttpRequest
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...args) {
    if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;
    }
    return originalOpen.call(this, method, url, ...args);
};