// UBICACION: public/js/auth-guard.js
(function() {
    const userStr = sessionStorage.getItem('user');
    const path = window.location.pathname;

    if (!userStr && !path.includes('login.html') && !path.includes('registro.html')) {
        window.location.replace('login.html');
        return;
    }
    if (userStr && (path.includes('login.html') || path.includes('registro.html'))) {
        window.location.replace('index.html');
        return;
    }

    function inyectarPerfil() {
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const nav = document.querySelector('.topbar');
        
        if (nav && !document.getElementById('user-badge-global')) {
            let partes = user.nombre_completo.split(' ');
            let iniciales = partes[0][0] + (partes[1] ? partes[1][0] : '');
            
            const badge = document.createElement('ul');
            badge.className = 'navbar-nav ml-auto';
            badge.id = 'user-badge-global';
            badge.innerHTML = `
                <li class="nav-item d-flex align-items-center pr-3">
                    <span class="mr-2 d-none d-sm-inline text-white font-weight-bold">${partes[0]}</span>
                    <div class="bg-white text-dark rounded-circle d-flex align-items-center justify-content-center shadow-sm font-weight-bold" style="width: 38px; height: 38px;">
                        ${iniciales.toUpperCase()}
                    </div>
                </li>`;
            nav.appendChild(badge);

            // SEGURIDAD DE ROLES: Ocultar botones si id_rol !== 1 (Admin)
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
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', inyectarPerfil); }
    else { inyectarPerfil(); }
    setTimeout(inyectarPerfil, 500);
})();

window.cerrarSesion = (e) => { 
    if(e) e.preventDefault(); 
    sessionStorage.clear(); 
    window.location.replace('login.html'); 
};