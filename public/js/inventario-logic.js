let todosLosArboles = [];
let mapRegistro;
let markerRegistro;
let poligonosZonas = [];

document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const cachedSidebar = sessionStorage.getItem('sidebarHTML');
    
    if (cachedSidebar) {
        sidebarContainer.innerHTML = cachedSidebar;
        document.body.classList.add('listo');
    } else {
        fetch('components/sidebar.html?v=' + new Date().getTime()).then(r => r.text()).then(html => {
            sessionStorage.setItem('sidebarHTML', html); 
            sidebarContainer.innerHTML = html;
            setTimeout(() => { document.body.classList.add('listo'); }, 10);
        });
    }

    // --- BLOQUEO DE SEGURIDAD VISUAL (BOTÓN AGREGAR) ---
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isAdmin = user && user.id_rol === 1;
    
    // Si no es admin, ocultamos el botón de "Agregar Árbol" que abre el modal
    if (!isAdmin) {
        const btnAgregar = document.querySelector('[data-target="#modalNuevoArbol"]');
        if (btnAgregar) btnAgregar.style.display = 'none';
    }

    cargarTablaInventario();
    cargarCampanasSelect();
    
    document.getElementById('filtro-texto').addEventListener('input', aplicarFiltros);
    document.getElementById('filtro-zona').addEventListener('change', aplicarFiltros);
    document.getElementById('filtro-estado').addEventListener('change', aplicarFiltros);

    // Guardar nuevo árbol
    document.getElementById('formAgregarArbol').addEventListener('submit', async function(e) {
        e.preventDefault();
        try {
            const formData = new FormData(this);
            if(user) formData.append('id_usuario', user.id_usuario);

            await ApiService.post('/trees', formData);
            
            $('#modalNuevoArbol').modal('hide');
            this.reset();
            if(markerRegistro) mapRegistro.removeLayer(markerRegistro);
            document.getElementById('zona-detectada-text').innerText = 'Esperando ubicación...';
            ApiService.toast('success', '¡Árbol registrado con éxito!');
            cargarTablaInventario();
        } catch (err) { } 
    });

    // Editar árbol
    document.getElementById('formEditarArbol').addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id_arbol').value;
        const data = Object.fromEntries(new FormData(this).entries());
        
        try {
            await ApiService.put(`/trees/${id}`, data);
            $('#modalEditarArbol').modal('hide');
            ApiService.toast('success', '¡Datos actualizados!');
            cargarTablaInventario();
        } catch(err) { } 
    });
});

function renderizarTabla(arboles) {
    const tbody = document.getElementById('tbody-arboles');
    tbody.innerHTML = '';
    
    const user = JSON.parse(sessionStorage.getItem('user'));
    const isAdmin = user && user.id_rol === 1;

    if(arboles.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 font-italic text-muted">No se encontraron árboles.</td></tr>';
        return;
    }

    arboles.forEach((a, i) => {
        let badge = a.estado === 'Bueno' ? 'success' : (a.estado === 'Regular' ? 'warning' : 'danger');
        let foto = a.foto_actual ? `/uploads/${a.foto_actual}` : 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png';
        let zonaNombre = a.nombre_zona ? a.nombre_zona : 'Sin zona asignada';
        
        // --- LÓGICA DINÁMICA DE ACCIONES ---
        // El "ojito" lo ven todos
        let acciones = `
            <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" 
               class="btn btn-sm btn-outline-info rounded-circle shadow-sm" 
               title="Ver Expediente">
               <i class="fas fa-eye"></i>
            </a>
        `;

        // El botón de Editar y Borrar SOLO lo ve el Admin
        if (isAdmin) {
            acciones += `
                <button class="btn btn-sm btn-outline-warning rounded-circle shadow-sm mx-1" 
                        onclick="abrirModalEditar(${a.id_arbol})" title="Editar">
                        <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm" 
                        onclick="eliminarArbol(${a.id_arbol})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                </button>
            `;
        }
        
        tbody.innerHTML += `
            <tr class="border-bottom animate__animated animate__fadeIn">
                 <td class="pl-3 font-weight-bold text-muted align-middle">${a.id_arbol || (i+1)}</td>
                <td class="align-middle"><img src="${foto}" class="img-arbol-tabla shadow-sm border" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;"></td>
                <td class="align-middle">
                    <div class="font-weight-bold text-success" style="font-size: 1.05rem;">${a.nombre_comun}</div>
                    <div class="small text-muted mb-1">${a.nombre_cientifico || 'Sin registro'}</div>
                    <span class="badge badge-light border text-secondary shadow-none"><i class="fas fa-tag mr-1"></i>${a.codigo_etiqueta}</span>
                </td>
                <td class="align-middle"><div class="font-weight-bold text-dark">${zonaNombre}</div><small class="text-info"><i class="fas fa-map-marker-alt mr-1"></i>${a.latitud}, ${a.longitud}</small></td>
                <td class="align-middle text-center"><span class="badge badge-${badge} px-3 py-2 rounded-pill shadow-none">${a.estado || 'N/A'}</span></td>
                <td class="text-center align-middle ocultar-impresion">
                    ${acciones}
                </td>
            </tr>`;
    });
}

function aplicarFiltros() {
    const txt = document.getElementById('filtro-texto').value.toLowerCase();
    const z = document.getElementById('filtro-zona').value;
    const e = document.getElementById('filtro-estado').value;
    
    renderizarTabla(todosLosArboles.filter(a => 
        (a.nombre_comun.toLowerCase().includes(txt) || a.codigo_etiqueta.toLowerCase().includes(txt)) &&
        (z === 'Todas' || (a.nombre_zona || 'General') === z) && (e === 'Todos' || a.estado === e)
    ));
}

async function cargarTablaInventario() {
    try {
        const data = await ApiService.get('/trees/stats');
        todosLosArboles = data.arboles;
        const sel = document.getElementById('filtro-zona');
        if (sel) {
            sel.innerHTML = '<option value="Todas">Todas las Zonas</option>';
            [...new Set(data.arboles.map(x => x.nombre_zona).filter(z => z))].forEach(z => sel.innerHTML += `<option value="${z}">${z}</option>`);
        }
        renderizarTabla(todosLosArboles);
    } catch (e) { }
}

async function cargarCampanasSelect() {
    try {
        const campanas = await ApiService.get('/campaigns/active');
        const sel = document.querySelector('select[name="id_reforestacion"]');
        if(sel) {
            sel.innerHTML = '<option value="">No (Árbol ya existente)</option>';
            campanas.forEach(c => {
                sel.innerHTML += `<option value="${c.id_reforestacion}">${c.nombre_propuesta}</option>`;
            });
        }
    } catch (e) { }
}

window.abrirModalEditar = async function(id) {
    try {
        const a = await ApiService.get(`/trees/${id}`);
        document.getElementById('edit-id_arbol').value = a.id_arbol;
        document.getElementById('edit-codigo').value = a.codigo_etiqueta;
        document.getElementById('edit-comun').value = a.nombre_comun;
        document.getElementById('edit-cientifico').value = a.nombre_cientifico;
        document.getElementById('edit-desc').value = a.descripcion;
        document.getElementById('edit-lat').value = a.latitud;
        document.getElementById('edit-lng').value = a.longitud;
        document.getElementById('edit-sitio').value = a.id_sitio || '';
        
        $('#modalEditarArbol').modal('show');
    } catch(e) { }
};

window.eliminarArbol = async function(id) {
    const result = await Swal.fire({
        title: '¿Borrar árbol del inventario?',
        text: "Se eliminará también su expediente y reportes médicos. Esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: 'Sí, borrar definitivamente',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    if(!result.isConfirmed) return;

    try {
        await ApiService.delete(`/trees/${id}`);
        ApiService.toast('success', 'Árbol eliminado.');
        cargarTablaInventario();
    } catch(e) { }
};

// ==========================================
// LÓGICA DE GEOLOCALIZACIÓN Y ZONAS
// ==========================================

function evaluarPoligonos(lat, lng) {
    const punto = turf.point([lng, lat]);
    let zonaDetectada = false;

    for (let zona of poligonosZonas) {
        let polyGeo = zona.layer.toGeoJSON();
        let inside = false;
        if (polyGeo.type === 'FeatureCollection') {
            for (let f of polyGeo.features) { if (turf.booleanPointInPolygon(punto, f)) inside = true; }
        } else { 
            if (turf.booleanPointInPolygon(punto, polyGeo)) inside = true; 
        }
        
        if (inside) {
            document.getElementById('id_sitio').value = zona.id;
            document.getElementById('zona-detectada-text').innerHTML = `<span class="text-success font-weight-bold animate__animated animate__pulse"><i class="fas fa-check-circle mr-1"></i>${zona.nombre}</span>`;
            zonaDetectada = true; 
            break;
        }
    }
    if(!zonaDetectada) {
        const idSitioInput = document.getElementById('id_sitio');
        if (idSitioInput) idSitioInput.value = "";
        document.getElementById('zona-detectada-text').innerHTML = `<span class="text-danger font-weight-bold animate__animated animate__headShake"><i class="fas fa-exclamation-triangle mr-1"></i>Fuera de zona UTM registrada</span>`;
    }
}

$('#modalNuevoArbol').on('shown.bs.modal', async function () {
    if (!mapRegistro) {
        mapRegistro = L.map('mapaSeleccion').setView([19.7267, -101.1619], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRegistro);
        
        try {
            const zonas = await ApiService.get('/sites');
            zonas.forEach(z => {
                if (z.coordenadas_poligono) {
                    const geojson = JSON.parse(z.coordenadas_poligono);
                    const capa = L.geoJSON(geojson, { style: { color: '#009688', weight: 2, fillOpacity: 0.15 } }).addTo(mapRegistro);
                    poligonosZonas.push({ id: z.id_sitio, nombre: z.nombre_zona, layer: capa });
                }
            });
        } catch (error) { }
        
        mapRegistro.on('click', function(e) {
            const lat = e.latlng.lat, lng = e.latlng.lng;
            if (markerRegistro) mapRegistro.removeLayer(markerRegistro);
            markerRegistro = L.marker([lat, lng]).addTo(mapRegistro);
            
            document.getElementById('lat').value = lat.toFixed(6);
            document.getElementById('lng').value = lng.toFixed(6);
            
            evaluarPoligonos(lat, lng);
        });
    } else { 
        mapRegistro.invalidateSize(); 
    }
});

// Obtener GPS del Dispositivo
window.obtenerCoordenadasGPS = function() {
    if (!navigator.geolocation) {
        return ApiService.toast('warning', 'Tu dispositivo no soporta GPS.');
    }

    ApiService.showLoading();

    navigator.geolocation.getCurrentPosition(
        (position) => {
            ApiService.hideLoading();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            const latInput = document.getElementById('lat');
            const lngInput = document.getElementById('lng');
            latInput.value = lat.toFixed(6);
            lngInput.value = lng.toFixed(6);
            
            latInput.classList.add('animate__animated', 'animate__flash');
            lngInput.classList.add('animate__animated', 'animate__flash');
            
            if (markerRegistro) mapRegistro.removeLayer(markerRegistro);
            markerRegistro = L.marker([lat, lng]).addTo(mapRegistro);
            mapRegistro.setView([lat, lng], 18); 

            evaluarPoligonos(lat, lng);
            ApiService.toast('success', '¡GPS Localizado!');
        },
        (error) => {
            ApiService.hideLoading();
            let mensaje = 'No se pudo obtener la ubicación.';
            if (error.code === 1) mensaje = 'Denegaste el permiso de GPS.';
            if (error.code === 2) mensaje = 'No hay señal de GPS disponible.';
            if (error.code === 3) mensaje = 'Se agotó el tiempo de espera del GPS.';
            
            ApiService.toast('error', mensaje);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
};

// Autocompletar con iNaturalist
document.getElementById('btn-autocompletar').addEventListener('click', async () => {
    const nombreBusqueda = document.querySelector('input[name="nombre_comun"]').value;
    const inputCientifico = document.querySelector('input[name="nombre_cientifico"]');
    const inputDesc = document.querySelector('textarea[name="descripcion"]');
    
    if (!nombreBusqueda) return ApiService.toast('warning', 'Escribe el nombre común primero.');
    
    const btn = document.getElementById('btn-autocompletar');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; btn.disabled = true;

    try {
        const res = await fetch(`https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(nombreBusqueda)}&locale=es&per_page=1`);
        const data = await res.json();
       
        if (data.results && data.results.length > 0) {
            const taxa = data.results[0];
            inputCientifico.value = taxa.name;
            inputCientifico.classList.add('animate__animated', 'animate__flash');

            if (taxa.wikipedia_summary) {
                let resumen = taxa.wikipedia_summary.replace(/<[^>]*>?/gm, '');
                inputDesc.value = resumen.split('\n')[0];
            } else {
                inputDesc.value = `Especie perteneciente al género ${taxa.name}.`;
            }
            inputDesc.classList.add('animate__animated', 'animate__flash');
            ApiService.toast('success', 'Datos botánicos encontrados.');
        } else {
            ApiService.toast('warning', 'No se encontraron resultados en la BD botánica.');
        }
    } catch (e) {
    } finally {
        btn.innerHTML = '<i class="fas fa-search"></i>'; btn.disabled = false;
        setTimeout(() => {
            inputCientifico.classList.remove('animate__animated', 'animate__flash');
            inputDesc.classList.remove('animate__animated', 'animate__flash');
        }, 1000);
    }
});