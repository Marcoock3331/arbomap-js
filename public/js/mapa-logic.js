document.addEventListener('DOMContentLoaded', async () => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const sidebarContainer = document.getElementById('sidebar-container');
    const cachedSidebar = sessionStorage.getItem('sidebarHTML');
    if (cachedSidebar) {
        sidebarContainer.innerHTML = cachedSidebar;
    } else {
        const r = await fetch('components/sidebar.html?v=' + new Date().getTime());
        const html = await r.text();
        sessionStorage.setItem('sidebarHTML', html);
        sidebarContainer.innerHTML = html;
    }
    document.body.classList.add('listo');

    const map = L.map('map').setView([19.7267, -101.1619], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 21, 
        attribution: '© OSM'
    }).addTo(map);

    // DOS ICONOS DIFERENTES
    const iconLibre = L.divIcon({
        html: '<i class="fas fa-tree tree-green" style="color: #2e7d32; font-size: 22px;"></i>',
        className: 'custom-tree', iconSize: [20, 20], iconAnchor: [10, 20]
    });

    const iconOcupado = L.divIcon({
        html: '<i class="fas fa-tree tree-gold" style="color: #d4af37; font-size: 22px;"></i>',
        className: 'custom-tree', iconSize: [20, 20], iconAnchor: [10, 20]
    });

    try {
        const zonas = await ApiService.get('/sites');
        zonas.forEach(z => {
            if (z.coordenadas_poligono) {
                const layer = L.geoJSON(JSON.parse(z.coordenadas_poligono), { 
                    style: { color: '#008B8B', weight: 2, fillOpacity: 0.15 } 
                }).addTo(map);
                layer.on('click', () => mostrarInfoZona(z));
            }
        });

        await cargarPinesArboles(map, iconLibre, iconOcupado);
    } catch (e) { console.error("Error cargando datos del mapa:", e); }
});

async function cargarPinesArboles(map, iconLibre, iconOcupado) {
    const data = await ApiService.get('/trees/stats');
    let total = 0, ocupados = 0, libres = 0;

    data.arboles.forEach(a => {
        total++;
        let iconUsar = iconLibre;
        
        // Si la base de datos nos dice que tiene un padrino, usamos el pino dorado
        if (a.padrino) {
            ocupados++;
            iconUsar = iconOcupado;
        } else {
            libres++;
        }

        const m = L.marker([a.latitud, a.longitud], { icon: iconUsar }).addTo(map);
        m.on('click', (e) => { 
            L.DomEvent.stopPropagation(e); 
            mostrarInfoArbol(a); 
        });
    });

    // Actualizamos la barra de estadísticas
    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-ocupados').innerText = ocupados;
    document.getElementById('stat-libres').innerText = libres;
}

function mostrarInfoArbol(a) {
    let bad = a.estado === 'Bueno' ? 'success' : (a.estado === 'Regular' ? 'warning' : 'danger');
    let fot = a.foto_actual ? `/uploads/${a.foto_actual}` : 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png';
    
    // Verificamos quién está usando el sistema (Admin vs Voluntario)
    const userStr = sessionStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const isVoluntario = user && user.id_rol === 2;

    let seccionApadrinamiento = '';

    if (a.padrino) {
        // Árbol ya ocupado
        seccionApadrinamiento = `<div class="alert alert-warning p-2 mt-3 mb-0 small font-weight-bold shadow-sm" style="border-radius: 8px;"><i class="fas fa-medal text-warning mr-2"></i>Apadrinado por: <span class="text-dark">${a.padrino}</span></div>`;
    } else {
        // Árbol libre
        if (isVoluntario) {
            seccionApadrinamiento = `<button class="btn btn-primary btn-block rounded-pill font-weight-bold mt-3 shadow-sm animate__animated animate__pulse animate__infinite" onclick="adoptarArbolEnMapa(${a.id_arbol}, '${a.nombre_comun}')"><i class="fas fa-hand-holding-heart mr-2"></i>¡Apadrinar este Árbol!</button>`;
        } else {
            seccionApadrinamiento = `<div class="alert alert-success p-2 mt-3 mb-0 small font-weight-bold shadow-sm" style="border-radius: 8px;"><i class="fas fa-check-circle text-success mr-2"></i>Árbol Disponible</div>`;
        }
    }

    // APLICADA SOLUCIÓN PARA LA FOTO EXPANDIBLE CON EL ONCLICK MAGICO Y CURSOR DE LUPA
    document.getElementById('info-panel').innerHTML = `
        <div class="text-center animate__animated animate__fadeIn">
            <img src="${fot}" class="img-fluid rounded border mb-3 shadow-sm" style="height:200px; width:100%; object-fit:cover; cursor: zoom-in; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="Swal.fire({ imageUrl: this.src, imageAlt: 'Foto del árbol', showConfirmButton: false, width: 'auto', background: 'transparent' })" title="Clic para expandir foto">
            
            <h4 class="font-weight-bold text-success">${a.nombre_comun}</h4>
            <span class="badge badge-${bad} px-3 py-2 mb-3 shadow-sm">${a.estado || 'N/A'}</span>
            
            <div class="text-left bg-light p-3 rounded border mb-3 shadow-sm">
                <p class="mb-1"><i class="fas fa-tag text-info mr-2"></i><b>Etiqueta:</b> ${a.codigo_etiqueta}</p>
                <p class="mb-0"><i class="fas fa-map-marker-alt text-danger mr-2"></i><b>Zona:</b> ${a.nombre_zona || 'General'}</p>
            </div>
            
            <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" class="btn btn-success btn-block rounded-pill font-weight-bold shadow-sm mb-2">Ver Expediente Clínico</a>
            
            ${seccionApadrinamiento}
        </div>`;
}

function mostrarInfoZona(z) {
    document.getElementById('info-panel').innerHTML = `
        <div class="text-center h-100 d-flex flex-column justify-content-center animate__animated animate__fadeIn">
            <i class="fas fa-draw-polygon fa-4x text-warning mb-4" style="opacity: 0.8;"></i>
            <h4 class="font-weight-bold text-dark">${z.nombre_zona}</h4>
            <div class="bg-light p-4 rounded border mt-4 text-left shadow-sm">
                <small class="text-muted font-weight-bold d-block mb-2">ENCARGADO DE LA ZONA:</small>
                <p class="mb-0 font-weight-bold" style="font-size: 1.1rem;"><i class="fas fa-user-tie text-primary mr-2"></i>${z.encargado || 'Sin asignar'}</p>
            </div>
        </div>`;
}

// ==========================================
// NUEVO: FUNCIÓN PARA APADRINAR DESDE EL MAPA (CON RUTA CORREGIDA)
// ==========================================
window.adoptarArbolEnMapa = async function(id_arbol, nombre_comun) {
    const result = await Swal.fire({
        title: '¡Apadrinar Árbol!',
        html: `¿Prometes cuidar, regar y reportar el estado de salud de este <b>${nombre_comun}</b>?`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonColor: '#2e7d32',
        cancelButtonColor: '#858796',
        confirmButtonText: '<i class="fas fa-leaf mr-1"></i> Sí, lo apadrino',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        
        // CORRECCIÓN DEL 404: Se incrusta el ID en la URL de forma RESTful
        await ApiService.post(`/trees/${id_arbol}/adopt`, { 
            id_usuario: user.id_usuario 
        });
        
        ApiService.toast('success', '¡Gracias por unirte a la causa! Recarga la página para ver tu árbol dorado.');
        setTimeout(() => location.reload(), 2000);
    } catch (e) {
        // Error manejado por ApiService visualmente
    }
};