document.addEventListener('DOMContentLoaded', () => {
    
    // 1. CARGAR EL SIDEBAR (Porque ya no tenemos 'include' de PHP)
    // Tienes que crear un archivo sidebar.html en public/components/
    fetch('components/sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;
        })
        .catch(err => console.log("Ojo: No has creado el archivo components/sidebar.html todavía"));

    // 2. INICIALIZAR EL MAPA (Centrado en el tec)
    var map = L.map('dashboardMap').setView([19.7267, -101.1619], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // 3. PEDIR DATOS AL SERVIDOR (Aquí ocurre la magia)
    fetch('/api/dashboard-stats')
        .then(response => response.json())
        .then(data => {
            // A. Rellenar los numeritos
            document.getElementById('total-arboles').innerText = data.totalArboles;
            document.getElementById('total-especies').innerText = data.totalEspecies;
            document.getElementById('total-sanos').innerText = data.totalSanos || 0;

            // B. Dibujar los puntos en el mapa
            var treeIcon = L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png',
                iconSize: [25, 25], iconAnchor: [12, 25], popupAnchor: [0, -25]
            });

            data.arboles.forEach(arbol => {
                var lat = parseFloat(arbol.latitud);
                var lng = parseFloat(arbol.longitud);

                if (lat && lng) {
                    var color = arbol.estado === 'Malo' ? 'red' : (arbol.estado === 'Regular' ? 'orange' : 'green');
                    var popupContent = `<div class='text-center'>
                                            <b>${arbol.nombre_comun}</b><br>
                                            <span style='color:${color}'>${arbol.estado || 'Sin revisión'}</span>
                                        </div>`;
                    
                    L.marker([lat, lng], {icon: treeIcon})
                        .addTo(map)
                        .bindPopup(popupContent);
                }
            });
        })
        .catch(error => console.error('Error conectando con el servidor:', error));
});