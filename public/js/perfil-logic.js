document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');
    
    try {
        const cachedSidebar = sessionStorage.getItem('sidebarHTML');
        if (cachedSidebar) {
            sidebarContainer.innerHTML = cachedSidebar;
        } else {
            const res = await fetch('components/sidebar.html');
            if (res.ok) {
                const html = await res.text();
                sessionStorage.setItem('sidebarHTML', html); 
                sidebarContainer.innerHTML = html;
            }
        }
    } catch (err) { console.error(err); }
    finally { setTimeout(mostrarPagina, 100); }

    const sessionData = sessionStorage.getItem('user');
    if (!sessionData) { window.location.href = 'login.html'; return; }

    const usuarioActual = JSON.parse(sessionData);
    cargarDatosPerfil(usuarioActual);
});

async function cargarDatosPerfil(user) {
    try {
        const data = await ApiService.get(`/users/${user.id_usuario}/profile`);
        const info = data.usuario;
        const arboles = data.arboles;

        let partesNombre = info.nombre_completo.trim().split(' ');
        let iniciales = partesNombre[0].charAt(0).toUpperCase();
        if (partesNombre.length > 1) iniciales += partesNombre[1].charAt(0).toUpperCase();
        
        document.getElementById('topbar-name').innerText = partesNombre[0];
        document.getElementById('topbar-initials').innerText = iniciales;
        document.getElementById('perfil-iniciales').innerText = iniciales;
        document.getElementById('perfil-nombre').innerText = info.nombre_completo;
        document.getElementById('perfil-matricula').innerText = info.matricula;
        document.getElementById('perfil-rol').innerText = info.rol;
        document.getElementById('perfil-conteo').innerText = arboles.length;

        const contenedor = document.getElementById('contenedor-arboles');
        contenedor.innerHTML = '';
        
        if (arboles.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="text-muted mb-3"><i class="fas fa-leaf fa-3x opacity-50"></i></div>
                    <h5 class="font-weight-bold text-gray-700">Aún no has apadrinado ningún árbol</h5>
                    <a href="inventario.html" class="btn btn-success rounded-pill px-4 mt-2">Ir al Inventario</a>
                </div>`;
            return;
        }

        arboles.forEach(a => {
            let badgeClass = a.estado_actual === 'Bueno' ? 'success' : (a.estado_actual === 'Regular' ? 'warning text-dark' : 'danger');
            let foto = a.foto ? `/uploads/${a.foto}` : 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png';
            let fAdopcion = new Date(a.fecha_asignacion);
            fAdopcion.setMinutes(fAdopcion.getMinutes() + fAdopcion.getTimezoneOffset());

            contenedor.innerHTML += `
                <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                    <div class="card card-arbol h-100">
                        <div class="position-relative">
                            <img src="${foto}" class="img-arbol">
                            <span class="badge badge-${badgeClass} badge-estado text-uppercase">${a.estado_actual || 'Desconocido'}</span>
                        </div>
                        <div class="card-body">
                            <h5 class="font-weight-bold text-gray-800 mb-0">${a.nombre_comun}</h5>
                            <p class="small text-muted font-italic mb-3">${a.nombre_cientifico || 'Sin clasificar'}</p>
                            <div class="small text-gray-700 mb-1"><i class="fas fa-map-marker-alt text-danger mr-2"></i>${a.nombre_zona || 'Campus General'}</div>
                            <div class="small text-gray-700 mb-3"><i class="fas fa-tag text-info mr-2"></i>${a.codigo_etiqueta}</div>
                            <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" class="btn btn-success btn-block rounded-pill font-weight-bold shadow-sm">
                                <i class="fas fa-stethoscope mr-1"></i> Cuidar / Reportar
                            </a>
                        </div>
                        <div class="card-footer bg-white text-center border-top-0 pt-0">
                            <small class="text-muted">Adoptado el: ${fAdopcion.toLocaleDateString()}</small>
                        </div>
                    </div>
                </div>`;
        });
    } catch (e) { 
        console.error("Error cargando perfil:", e); 
        alert("Error al cargar el perfil");
    }
}