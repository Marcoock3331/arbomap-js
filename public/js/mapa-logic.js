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

    const map = L.map('map').setView([19.7267, -101.1619], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const icon = L.divIcon({
        html: '<i class="fas fa-tree" style="color: #2e7d32; font-size: 18px; text-shadow: 1px 1px 3px rgba(0,0,0,0.4);"></i>',
        className: 'custom-tree', iconSize: [10, 10], iconAnchor: [12, 18]
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
        <div class="text-center">
            <img src="${fot}" class="img-fluid rounded border mb-3" style="height:200px; width:100%; object-fit:cover;">
            <h4 class="font-weight-bold text-success">${a.nombre_comun}</h4>
            <span class="badge badge-${bad} px-3 py-2 mb-4">${a.estado || 'N/A'}</span>
            <div class="text-left bg-light p-3 rounded border mb-3">
                <small><b>Etiqueta:</b> ${a.codigo_etiqueta}</small><br>
                <small><b>Zona:</b> ${a.nombre_zona || 'General'}</small>
            </div>
            <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" class="btn btn-success btn-block rounded-pill">Ver Expediente</a>
        </div>`;
}

function mostrarInfoZona(z) {
    document.getElementById('info-panel').innerHTML = `
        <div class="text-center h-100 d-flex flex-column justify-content-center">
            <i class="fas fa-draw-polygon fa-4x text-warning mb-4"></i>
            <h4 class="font-weight-bold">${z.nombre_zona}</h4>
            <div class="bg-light p-3 rounded border mt-3 text-left">
                <small class="text-muted font-weight-bold">ENCARGADO:</small>
                <p class="mb-0"><b>${z.encargado || 'Sin asignar'}</b></p>
            </div>
        </div>`;
}