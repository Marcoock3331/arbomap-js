// UBICACIÓN: public/js/index-logic.js

document.addEventListener('DOMContentLoaded', async () => {
    
    // 1. Cargar el Menú Lateral y mostrar la página suavemente para evitar parpadeos
    fetch('components/sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;
            
            // ¡Esta línea hace que la página aparezca suavemente sin brincos!
            document.body.classList.add('listo');
        })
        .catch(error => console.error("Error al cargar el menú:", error));

    try {
        // 2. Traer estadísticas de la BD (Node.js API)
        const responseStats = await fetch('/api/dashboard-stats');
        const dataStats = await responseStats.json();

        // 3. Llenar Tarjetas Superiores
        document.getElementById('tot-arboles').textContent = dataStats.totalArboles || 0;
        document.getElementById('tot-especies').textContent = dataStats.totalEspecies || 0;
        document.getElementById('tot-sanos').textContent = dataStats.totalSanos || 0;

        // 4. Preparar datos para la Gráfica de Dona
        let buenos = 0; 
        let regulares = 0; 
        let malos = 0; 
        let sinRevisar = 0;

        if(dataStats.arboles) {
            dataStats.arboles.forEach(arbol => {
                if(arbol.estado === 'Bueno') buenos++;
                else if(arbol.estado === 'Regular') regulares++;
                else if(arbol.estado === 'Malo') malos++;
                else sinRevisar++; 
            });
        }

        // 5. Configurar e instanciar Gráfica de Dona (con Animación estilo PHP)
        const ctxElement = document.getElementById('saludPieChart');
        if (ctxElement) {
            const ctx = ctxElement.getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Bueno', 'Regular', 'Malo', 'Sin Revisión'],
                    datasets: [{
                        data: [buenos, regulares, malos, sinRevisar],
                        backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b', '#858796'], // Tus colores exactos
                        hoverBackgroundColor: ['#17a673', '#dda20a', '#be2617', '#6e707e'],
                        hoverBorderColor: "rgba(234, 236, 244, 1)",
                        borderWidth: 1,
                        borderColor: '#1a2e1f' // Borde oscuro para que combine con el fondo
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%', // Grosor de la dona
                    // --- AQUÍ ESTÁ LA ANIMACIÓN ---
                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 1500, // Dura 1.5 segundos en dibujarse
                        easing: 'easeOutQuart'
                    },
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            labels: { color: '#fff', padding: 20 } 
                        }
                    }
                }
            });
        }

        // 6. Configurar Mapa ITM (Igual que en tu PHP)
        const mapElement = document.getElementById('dashboardMap');
        if (mapElement) {
            const map = L.map('dashboardMap').setView([19.7267, -101.1619], 16);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OSM'
            }).addTo(map);

            // 7. Dibujar Zonas (Polígonos verdes transparentes)
            const responseSitios = await fetch('/api/sitios');
            const sitios = await responseSitios.json();

            sitios.forEach(sitio => {
                if (sitio.coordenadas_poligono) {
                    try {
                        const geojsonData = JSON.parse(sitio.coordenadas_poligono);
                        L.geoJSON(geojsonData, {
                            style: { color: '#1e7e34', weight: 2, fillColor: '#28a745', fillOpacity: 0.3 }
                        }).bindPopup(`<b>${sitio.nombre_zona}</b>`).addTo(map);
                    } catch(e) { 
                        console.error("Error en polígono", e); 
                    }
                }
            });

            // 8. Dibujar Puntos de Árboles (Con tu ícono personalizado)
            const treeIcon = L.icon({
                iconUrl: 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png', 
                iconSize: [25, 25], 
                iconAnchor: [12, 25], 
                popupAnchor: [0, -25]
            });

            if(dataStats.arboles) {
                dataStats.arboles.forEach(arbol => {
                    const lat = parseFloat(arbol.latitud);
                    const lng = parseFloat(arbol.longitud);
                    
                    if (!isNaN(lat) && !isNaN(lng)) {
                        let color = arbol.estado === 'Malo' ? 'red' : (arbol.estado === 'Regular' ? 'orange' : 'green');
                        let popupHtml = `<div class='text-center'><b>${arbol.nombre_comun}</b><br><span style='color:${color}'>${arbol.estado || 'Sin Revisión'}</span></div>`;
                        
                        L.marker([lat, lng], {icon: treeIcon})
                         .addTo(map)
                         .bindPopup(popupHtml);
                    }
                });
            }
        }

    } catch (error) {
        console.error("Error cargando el Dashboard:", error);
    }
});