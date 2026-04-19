// 1. DEFINICIÓN GLOBAL INMEDIATA (Fuera de cualquier bloque para evitar errores de carga)
window.cerrarSesion = function(e) { 
    if(e) e.preventDefault(); 
    console.log("Cerrando sesión activado...");
    sessionStorage.removeItem('user'); 
    sessionStorage.clear(); 
    window.location.replace('login.html'); 
};

(function() {
    const userStr = sessionStorage.getItem('user');
    const path = window.location.pathname;

    // Redirección si no hay sesión
    if (!userStr && !path.includes('login.html') && !path.includes('registro.html')) {
        window.location.replace('login.html');
        return;
    }
    
    // Redirección si ya hay sesión y está en login/registro
    if (userStr && (path.includes('login.html') || path.includes('registro.html'))) {
        window.location.replace('index.html');
        return;
    }

    // Inyección de perfil con protección contra datos nulos
    function inyectarPerfil() {
        if (!userStr) return;
        
        try {
            const user = JSON.parse(userStr);
            if (!user || !user.nombre_completo) return; // Protección si el objeto está corrupto

            const nav = document.querySelector('.topbar');
            if (nav && !document.getElementById('user-badge-global')) {
                let partes = user.nombre_completo.trim().split(' ');
                let iniciales = partes[0].charAt(0);
                if (partes.length > 1) iniciales += partes[partes.length - 1].charAt(0);
                
                const badge = document.createElement('ul');
                badge.className = 'navbar-nav ml-auto';
                badge.id = 'user-badge-global';
                badge.innerHTML = `
                    <li class="nav-item d-flex align-items-center pr-3">
                        <span class="mr-2 d-none d-sm-inline text-white font-weight-bold">${partes[0]}</span>
                        <div class="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center shadow-sm font-weight-bold" style="width: 38px; height: 38px; font-size: 0.9rem;">
                            ${iniciales.toUpperCase()}
                        </div>
                    </li>`;
                nav.appendChild(badge);

                // SEGURIDAD DE ROLES: Ocultar botones administrativos si no es Admin
                if (user.id_rol !== 1) {
                    const style = document.createElement('style');
                    style.innerHTML = `
                        .btn-outline-danger, .btn-outline-warning, .btn-eliminar, .btn-editar,
                        [onclick*="eliminar"], [onclick*="abrirModalEditar"], #btn-agregar-arbol { 
                            display: none !important;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        } catch (error) {
            console.error("Error en auth-guard inyectarPerfil:", error);
        }
    }

    // Ejecutar al cargar y reintentar brevemente (por si el DOM tarda)
    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', inyectarPerfil);
    } else { 
        inyectarPerfil(); 
    }
    setTimeout(inyectarPerfil, 500);
})();