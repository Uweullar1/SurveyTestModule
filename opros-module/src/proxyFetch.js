const originalFetch = window.fetch;

window.fetch = async function (input, init) {
    let url;
    let options = { ...init };

    if (input instanceof Request) {
        url = input.url;
        options.method = options.method || input.method;
        // Сохраняем тело запроса
        if (input.body && !options.body) {
            options.body = input.body;
        }
        // Сохраняем заголовки
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

    // Не устанавливаем Content-Type для FormData (браузер сам добавит с boundary)
    if (options.body instanceof FormData) {
        const cleanHeaders = { ...options.headers };
        delete cleanHeaders['Content-Type'];
        options.headers = cleanHeaders;
    }

    return originalFetch(url, options);
};