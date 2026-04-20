// public/js/map-module.js
let dashMap = null;

export const MapModule = {
    initMap: function(containerId) {
        if (!document.getElementById(containerId)) return null;
        
        if (dashMap) {
            dashMap.remove();
        }

        dashMap = L.map(containerId).setView([19.7267, -101.1619], 17);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OSM',
            maxZoom: 19
        }).addTo(dashMap);

        return dashMap;
    },

    loadZones: function(sitios) {
        if (!dashMap || !sitios) return;

        sitios.forEach(sitio => {
            if (sitio.coordenadas_poligono) {
                try {
                    const geojsonData = JSON.parse(sitio.coordenadas_poligono);
                    L.geoJSON(geojsonData, {
                        style: { color: '#1e7e34', weight: 2, fillColor: '#28a745', fillOpacity: 0.3 }
                    }).bindPopup(`<b>${sitio.nombre_zona}</b>`).addTo(dashMap);
                } catch(e) { 
                    console.error("Error dibujando polígono:", e); 
                }
            }
        });
    },

    loadMarkers: function(arboles) {
        if (!dashMap || !arboles) return;

        const treeIcon = L.divIcon({
            html: '<i class="fas fa-tree" style="color: #2e7d32; font-size: 20px; text-shadow: 1px 1px 3px rgba(0,0,0,0.5);"></i>',
            className: 'custom-tree', 
            iconSize: [20, 20], 
            iconAnchor: [10, 20],
            popupAnchor: [0, -20]
        });

        arboles.forEach(arbol => {
            const lat = parseFloat(arbol.latitud);
            const lng = parseFloat(arbol.longitud);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                let color = arbol.estado === 'Malo' ? 'red' : (arbol.estado === 'Regular' ? 'orange' : 'green');
                let popupHtml = `<div class='text-center'><b>${arbol.nombre_comun}</b><br><span style='color:${color}'>${arbol.estado || 'Sin Revisión'}</span></div>`;
            
                L.marker([lat, lng], {icon: treeIcon}).addTo(dashMap).bindPopup(popupHtml);
            }
        });
    }
};