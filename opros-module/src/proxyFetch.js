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

    // Проксируем все кроме storage (загрузка файлов)
    if (url.includes('supabase.co') && !url.includes('/storage/v1/object')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;
    }

    return originalFetch(url, options);
};