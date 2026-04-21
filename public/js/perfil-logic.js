document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');
    
    try {
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        if (res.ok) {
            const html = await res.text();
            sessionStorage.setItem('sidebarHTML', html); 
            sidebarContainer.innerHTML = html;
        }
    } catch (err) { 
        console.error("Error sidebar:", err);
    } finally { 
        setTimeout(mostrarPagina, 100);
    }

    const sessionData = sessionStorage.getItem('user');
    if (!sessionData) { window.location.href = 'login.html'; return; }

    const usuarioActual = JSON.parse(sessionData);
    cargarDatosPerfil(usuarioActual);

    // ==========================================
    // GESTIÓN DE FOTO DE PERFIL (UX MEJORADA)
    // ==========================================
    
    let fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const avatarContainer = document.querySelector('.avatar-circle');
    const cameraIcon = document.querySelector('.camera-icon');
    if (avatarContainer) {
        avatarContainer.style.cursor = 'pointer';
        avatarContainer.addEventListener('click', () => fileInput.click());
    }

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('foto', file);

        try {
            if (cameraIcon) cameraIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            const res = await ApiService.post(`/users/${usuarioActual.id_usuario}/photo`, formData);
            if (res.success) {
                ApiService.toast('success', '¡Foto de perfil actualizada!');
                cargarDatosPerfil(usuarioActual);
            }
        } catch (err) {
        } finally {
            if (cameraIcon) cameraIcon.innerHTML = '<i class="fas fa-camera"></i>';
            fileInput.value = ''; 
        }
    });
});

async function cargarDatosPerfil(user) {
    try {
        const data = await ApiService.get(`/users/${user.id_usuario}/profile`);
        const info = data.usuario;
        const arboles = data.arboles;

        let partesNombre = (info.nombre_completo ?? 'Usuario').trim().split(' ');
        let iniciales = partesNombre[0].charAt(0).toUpperCase();
        if (partesNombre.length > 1) iniciales += partesNombre[1].charAt(0).toUpperCase();
        
        // --- RENDERIZADO DEL AVATAR ---
        const avatarContainer = document.querySelector('.avatar-circle');
        const spanIniciales = document.getElementById('perfil-iniciales');
        let imgPerfil = document.getElementById('img-perfil-display');

        if (!imgPerfil) {
            imgPerfil = document.createElement('img');
            imgPerfil.id = 'img-perfil-display';
            imgPerfil.style.cssText = 'width: 100%; height: 100%; border-radius: 50%; object-fit: cover; position: absolute; top: 0; left: 0; z-index: 1;';
            avatarContainer.insertBefore(imgPerfil, avatarContainer.firstChild);
        }

        const topbarInitials = document.getElementById('topbar-initials');
        if (info.foto_perfil) {
            imgPerfil.src = `/uploads/${info.foto_perfil}`;
            imgPerfil.style.display = 'block';
            spanIniciales.style.display = 'none';
            topbarInitials.innerHTML = `<img src="/uploads/${info.foto_perfil}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            topbarInitials.style.padding = '0';
        } else {
            imgPerfil.style.display = 'none';
            spanIniciales.style.display = 'block';
            spanIniciales.innerText = iniciales;
            topbarInitials.innerHTML = iniciales;
            topbarInitials.style.padding = '';
        }

        // --- DATOS GENERALES ---
        document.getElementById('topbar-name').innerText = partesNombre[0];
        document.getElementById('perfil-nombre').innerText = info.nombre_completo;
        document.getElementById('perfil-matricula').innerText = info.matricula;
        document.getElementById('perfil-rol').innerText = info.rol;
        
        // --- SI ES ADMINISTRADOR, MUESTRA PANEL EJECUTIVO ---
        const isAdmin = user.id_rol === 1;
        document.getElementById('perfil-conteo').innerText = isAdmin ? 'Admin' : (arboles.length ?? 0);

        const contenedor = document.getElementById('contenedor-arboles');
        contenedor.innerHTML = '';
        
        if (isAdmin) {
            // Reemplazamos el título del bosque por uno de Admin
            document.querySelector('h4.text-gray-800').innerHTML = '<i class="fas fa-shield-alt text-primary mr-2"></i> Panel de Administrador';
            
            contenedor.innerHTML = `
                <div class="col-12">
                    <div class="card border-left-primary shadow-sm mb-4">
                        <div class="card-body">
                            <h5 class="font-weight-bold text-primary mb-3">Resumen Ejecutivo</h5>
                            <p class="text-muted">Como administrador de ArboMap UTM, no tienes árboles asignados individualmente. Posees autoridad global sobre el inventario forestal y la logística de reforestación de la universidad.</p>
                            <hr>
                            <div class="d-flex flex-wrap mt-3">
                                <a href="inventario.html" class="btn btn-outline-success rounded-pill px-4 mr-2 mb-2"><i class="fas fa-tree mr-1"></i> Ver Inventario Completo</a>
                                <a href="gestion_padrinos.html" class="btn btn-outline-info rounded-pill px-4 mr-2 mb-2"><i class="fas fa-users mr-1"></i> Gestionar Voluntarios</a>
                                <a href="reforestacion.html" class="btn btn-outline-primary rounded-pill px-4 mb-2"><i class="fas fa-calendar-alt mr-1"></i> Panel de Reforestación</a>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // --- VISTA NORMAL DE VOLUNTARIO ---
        if (arboles.length === 0) {
            contenedor.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="text-muted mb-3"><i class="fas fa-leaf fa-3x opacity-50"></i></div>
                    <h5 class="font-weight-bold text-gray-700">Aún no has apadrinado ningún árbol</h5>
                    <a href="inventario.html" class="btn btn-success rounded-pill px-4 mt-2">Ir al Inventario</a>
                </div>`;
            return;
        }

        // --- RENDERIZADO DE TARJETAS ---
        arboles.forEach(a => {
            const badgeClass = a.estado_actual === 'Bueno' ? 'success' : (a.estado_actual === 'Regular' ? 'warning text-dark' : 'danger');
            const foto = a.foto ? `/uploads/${a.foto}` : 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png';
            let fAdopcion = new Date(a.fecha_asignacion);
            fAdopcion.setMinutes(fAdopcion.getMinutes() + fAdopcion.getTimezoneOffset());

            contenedor.innerHTML += `
                <div class="col-xl-3 col-lg-4 col-md-6 mb-4">
                    <div class="card card-arbol h-100 shadow-sm">
                        <div class="position-relative">
                            <img src="${foto}" class="img-arbol">
                            <span class="badge badge-${badgeClass} badge-estado text-uppercase">${a.estado_actual ?? 'Desconocido'}</span>
                        </div>
                        <div class="card-body">
                            <h5 class="font-weight-bold text-gray-800 mb-0">${a.nombre_comun}</h5>
                            <p class="small text-muted font-italic mb-3">${a.nombre_cientifico ?? 'Sin clasificar'}</p>
                            <div class="small text-gray-700 mb-1"><i class="fas fa-map-marker-alt text-danger mr-2"></i>${a.nombre_zona ?? 'Campus General'}</div>
                            <div class="small text-gray-700 mb-3"><i class="fas fa-tag text-info mr-2"></i>${a.codigo_etiqueta}</div>
                            
                            <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" class="btn btn-success btn-sm btn-block rounded-pill font-weight-bold shadow-sm">
                                <i class="fas fa-stethoscope mr-1"></i> Cuidar / Reportar
                            </a>
                            <button onclick="window.liberarArbol(${a.id_arbol})" class="btn btn-outline-danger btn-sm btn-block rounded-pill font-weight-bold mt-2">
                                <i class="fas fa-unlink mr-1"></i> Liberar Árbol
                            </button>
                        </div>
                        <div class="card-footer bg-white text-center border-top-0 pt-0">
                            <small class="text-muted font-weight-bold">Adoptado: ${fAdopcion.toLocaleDateString()}</small>
                        </div>
                    </div>
                </div>`;
        });
    } catch (e) { 
        console.error("Error cargando perfil:", e);
    }
}

// ==========================================
// FUNCIÓN PARA LIBERAR ÁRBOLES (SWEETALERT2)
// ==========================================
window.liberarArbol = async function(idArbol) {
    if (!idArbol) return ApiService.toast('error', 'No se identificó el árbol.');
    const result = await Swal.fire({
        title: '¿Liberar este árbol?',
        text: "Dejarás de ser su padrino y otro voluntario podrá adoptarlo para cuidarlo.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: 'Sí, liberar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        const sessionData = JSON.parse(sessionStorage.getItem('user'));
        
        // EL FIX: Enviamos el id_usuario en el cuerpo del POST
        const res = await ApiService.post(`/trees/${idArbol}/release`, { id_usuario: sessionData.id_usuario });
        
        if (res.success) {
            ApiService.toast('success', '¡Árbol liberado exitosamente!');
            cargarDatosPerfil(sessionData); // Refrescamos el perfil pasando el objeto parseado
        }
    } catch (err) { /* Error manejado por ApiService */ }
};