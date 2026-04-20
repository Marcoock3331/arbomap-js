const ApiService = {
    baseUrl: '/api',

    // ==========================================
    // 1. INYECCIÓN AUTOMÁTICA DE UX/UI
    // ==========================================
    initUI() {
        // Inyectamos SweetAlert2 si no existe
        if (!document.getElementById('swal-script')) {
            const script = document.createElement('script');
            script.id = 'swal-script';
            script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
            document.head.appendChild(script);
        }

        // Inyectamos el diseño del Spinner de carga en el HTML
        if (!document.getElementById('global-spinner')) {
            const style = document.createElement('style');
            style.innerHTML = `
                #global-spinner {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(255, 255, 255, 0.7); z-index: 99999;
                    display: flex; justify-content: center; align-items: center;
                    visibility: hidden; opacity: 0; transition: opacity 0.2s ease-out;
                    backdrop-filter: blur(2px);
                }
                #global-spinner.active { visibility: visible; opacity: 1; }
                .spinner-circle {
                    width: 60px; height: 60px; border: 5px solid #e3e6f0;
                    border-top: 5px solid #009688; border-radius: 50%;
                    animation: spin 1s linear infinite;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `;
            document.head.appendChild(style);

            const spinner = document.createElement('div');
            spinner.id = 'global-spinner';
            spinner.innerHTML = '<div class="spinner-circle"></div>';
            document.body.appendChild(spinner);
        }
    },

    showLoading() {
        const spinner = document.getElementById('global-spinner');
        if (spinner) spinner.classList.add('active');
    },

    hideLoading() {
        const spinner = document.getElementById('global-spinner');
        if (spinner) spinner.classList.remove('active');
    },

    // Función global para mostrar Toasts elegantes en cualquier archivo JS
    toast(icon, title) {
        if (window.Swal) {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                didOpen: (toast) => {
                    toast.onmouseenter = Swal.stopTimer;
                    toast.onmouseleave = Swal.resumeTimer;
                }
            });
            Toast.fire({ icon, title });
        } else {
            // Respaldo de emergencia por si el internet está muy lento y Swal no ha cargado
            alert(title);
        }
    },

    // ==========================================
    // 2. LÓGICA DE RED Y SEGURIDAD
    // ==========================================
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

        // PRENDEMOS EL SPINNER ANTES DE ENVIAR LA PETICIÓN
        this.showLoading();

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (response.status === 401 || response.status === 403) {
                if (window.cerrarSesion) {
                    window.cerrarSesion();
                } else {
                    sessionStorage.clear();
                    window.location.replace('login.html');
                }
                throw new Error("Tu sesión ha expirado. Por seguridad, vuelve a ingresar.");
            }

            if (!response.ok) {
                const errorMessage = data && (data.message || data.error) ? (data.message || data.error) : `Error HTTP: ${response.status}`;
                throw new Error(errorMessage);
            }
            
            return data;
        } catch (error) {
            console.error(`[API Error] ${options.method || 'GET'} ${url}:`, error.message);
            // MOSTRAMOS EL ERROR AUTOMÁTICAMENTE EN UN TOAST ROJO
            this.toast('error', error.message);
            throw error;
        } finally {
            // APAGAMOS EL SPINNER SIN IMPORTAR SI HUBO ÉXITO O ERROR
            this.hideLoading();
        }
    },

    get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
    post(endpoint, body) { return this.request(endpoint, { method: 'POST', body }); },
    put(endpoint, body) { return this.request(endpoint, { method: 'PUT', body }); },
    delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); }
};

// Autoejecutamos la inyección visual apenas el navegador lea este archivo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ApiService.initUI());
} else {
    ApiService.initUI();
}