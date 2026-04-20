document.addEventListener('DOMContentLoaded', async () => {
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    const sidebarContainer = document.getElementById('sidebar-container');
    const cachedSidebar = sessionStorage.getItem('sidebarHTML');
    if (cachedSidebar) {
        sidebarContainer.innerHTML = cachedSidebar;
    } else {
        const r = await fetch('components/sidebar.html');
        const html = await r.text();
        sessionStorage.setItem('sidebarHTML', html);
        sidebarContainer.innerHTML = html;
    }
    document.body.classList.add('listo');

    // === AQUÍ ESTÁ LA MAGIA DEL ZOOM ===
    // maxNativeZoom: Hasta qué nivel descargamos imágenes reales de internet (19 suele ser el tope de OSM)
    // maxZoom: Hasta qué nivel permitimos al usuario hacer zoom (estirando la imagen de fondo). 
    // Le puse 21 para que puedas acercarte a nivel de milímetros entre arbolitos.
    const map = L.map('map').setView([19.7267, -101.1619], 18);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxNativeZoom: 19,
        maxZoom: 21, 
        attribution: '© OSM'
    }).addTo(map);

    // Ajusté un poco el tamaño del icono para que no se vea gigante al hacer mucho zoom
    const icon = L.divIcon({
        html: '<i class="fas fa-tree" style="color: #2e7d32; font-size: 20px; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);"></i>',
        className: 'custom-tree', 
        iconSize: [20, 20], 
        iconAnchor: [10, 20]
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

        const data = await ApiService.get('/trees/stats');
        data.arboles.forEach(a => {
            const m = L.marker([a.latitud, a.longitud], { icon }).addTo(map);
            m.on('click', (e) => { 
                L.DomEvent.stopPropagation(e); 
                mostrarInfoArbol(a); 
            });
        });
    } catch (e) { console.error("Error cargando datos del mapa:", e); }
});

function mostrarInfoArbol(a) {
    let bad = a.estado === 'Bueno' ? 'success' : (a.estado === 'Regular' ? 'warning' : 'danger');
    let fot = a.foto_actual ? `/uploads/${a.foto_actual}` : 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png';
    document.getElementById('info-panel').innerHTML = `
        <div class="text-center fade-in">
            <img src="${fot}" class="img-fluid rounded border mb-3 shadow-sm" style="height:220px; width:100%; object-fit:cover;">
            <h4 class="font-weight-bold text-success">${a.nombre_comun}</h4>
            <span class="badge badge-${bad} px-3 py-2 mb-4 shadow-sm">${a.estado || 'N/A'}</span>
            <div class="text-left bg-light p-3 rounded border mb-3 shadow-sm">
                <p class="mb-1"><i class="fas fa-tag text-info mr-2"></i><b>Etiqueta:</b> ${a.codigo_etiqueta}</p>
                <p class="mb-0"><i class="fas fa-map-marker-alt text-danger mr-2"></i><b>Zona:</b> ${a.nombre_zona || 'General'}</p>
            </div>
            <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" class="btn btn-success btn-block rounded-pill font-weight-bold shadow">Ver Expediente Clínico</a>
        </div>`;
}

function mostrarInfoZona(z) {
    document.getElementById('info-panel').innerHTML = `
        <div class="text-center h-100 d-flex flex-column justify-content-center fade-in">
            <i class="fas fa-draw-polygon fa-4x text-warning mb-4" style="opacity: 0.8;"></i>
            <h4 class="font-weight-bold text-dark">${z.nombre_zona}</h4>
            <div class="bg-light p-4 rounded border mt-4 text-left shadow-sm">
                <small class="text-muted font-weight-bold d-block mb-2">ENCARGADO DE LA ZONA:</small>
                <p class="mb-0 font-weight-bold" style="font-size: 1.1rem;"><i class="fas fa-user-tie text-primary mr-2"></i>${z.encargado || 'Sin asignar'}</p>
            </div>
        </div>`;
}