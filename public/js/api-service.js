const ApiService = {
    baseUrl: '/api',

    // Extraemos el token del sessionStorage (si existe)
    getToken() {
        const userStr = sessionStorage.getItem('user');
        if (userStr) {
            const userObj = JSON.parse(userStr);
            return userObj.token || null;
        }
        return null;
    },

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = options.headers || {};

        // SI HAY UN TOKEN, LO INYECTAMOS EN LOS ENCABEZADOS DE LA PETICIÓN
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        if (options.body && !(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
            if (typeof options.body === 'object') {
                options.body = JSON.stringify(options.body);
            }
        }

        const config = { ...options, headers };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            // Si el backend nos rechaza por token inválido (401 o 403), cerramos sesión por seguridad
            if (response.status === 401 || response.status === 403) {
                if (window.cerrarSesion) {
                    window.cerrarSesion();
                } else {
                    sessionStorage.clear();
                    window.location.replace('login.html');
                }
                throw new Error("Sesión expirada o inválida.");
            }

            if (!response.ok) {
                const errorMessage = data && (data.message || data.error) ? (data.message || data.error) : `Error HTTP: ${response.status}`;
                throw new Error(errorMessage);
            }
            
            return data;
        } catch (error) {
            console.error(`[API Error] ${options.method || 'GET'} ${url}:`, error.message);
            throw error;
        }
    },

    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};