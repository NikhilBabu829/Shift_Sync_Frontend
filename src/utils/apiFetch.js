export default async function apiFetch(url, options = {}) {
    const isRelative = url.startsWith('/');
    const finalUrl = isRelative ? `${import.meta.env.VITE_API_BASE_URL}${url}` : url;

    const token = localStorage.getItem('aes52');

    // We modify headers carefully to preserve existing ones if passed
    const headers = { ...options.headers };

    // Add auth header if we have a token and it's not explicitly disabled
    if (token && !headers['authorization'] && !headers['Authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const finalOptions = { ...options, headers };

    const response = await fetch(finalUrl, finalOptions);

    if (response.status === 401) {
        // Special logic: do not intercept login requests since they need to show invalid credentials
        if (!finalUrl.includes('/login') && !finalUrl.includes('/auth') && !finalUrl.includes('/manager-login') && !finalUrl.includes('/staff-login')) {
            localStorage.removeItem('aes52');

            // Check if user was on a manager route
            if (window.location.pathname.includes('/manager')) {
                window.location.href = '/manager-login?message=Session expired, please login again.';
            } else {
                window.location.href = '/staff-login?message=Session expired, please login again.';
            }
            throw new Error('Unauthorized');
        }
    }

    return response;
}
