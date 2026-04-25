const originalFetch = window.fetch;

window.fetch = async function (input, init) {
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

    if (url.includes('supabase.co')) {
        const urlObj = new URL(url);
        const path = urlObj.pathname + urlObj.search;
        url = `${window.location.origin}/api/supabase-proxy${path}`;
    }

    // ВАЖНО: Для FormData не трогаем Content-Type!
    if (options.body instanceof FormData) {
        // Удаляем Content-Type, браузер сам установит с boundary
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

    return originalFetch(url, options);
};