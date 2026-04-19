// 1. TU SOLUCIÓN: Definir la función explícitamente en la lógica del Dashboard
window.cerrarSesion = function(e) { 
    if(e) e.preventDefault(); 
    sessionStorage.clear(); 
    window.location.replace('login.html'); 
};

let chartPie;
let dashMap; 

document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');

    try {
        // 2. ROMPE-CACHÉ: Agregamos un timestamp a la URL para forzar al navegador a descargar el HTML nuevo
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        const html = await res.text();
        sidebarContainer.innerHTML = html;
    } catch (err) { 
        console.error("Error sidebar:", err); 
    } finally { 
        setTimeout(mostrarPagina, 100); 
    }

    cargarStats();
});

async function cargarStats() {
    try {
        const data = await ApiService.get('/trees/stats');
        
       document.getElementById('total-arboles').innerText = data.totalArboles ?? 0;
        document.getElementById('total-especies').innerText = data.totalEspecies;
        document.getElementById('total-sanos').innerText = data.totalSanos;
        
        const b = data.totalSanos;
        const r = Math.floor((data.totalArboles - b) / 2); 
        const m = data.totalArboles - b - r;
        
        generarGrafica(b, r, m);
        cargarMapaDashboard(data.arboles); 
    } catch (e) { 
        console.error("Error cargando stats:", e); 
    }
}

async function cargarMapaDashboard(arboles) {
    const mapElement = document.getElementById('dashboardMap');
    if (!mapElement) return;

    if (dashMap) {
        dashMap.remove(); 
    }

    dashMap = L.map('dashboardMap').setView([19.7267, -101.1619], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM'
    }).addTo(dashMap);

    try {
        const sitios = await ApiService.get('/sites');
        sitios.forEach(sitio => {
            if (sitio.coordenadas_poligono) {
                try {
                    const geojsonData = JSON.parse(sitio.coordenadas_poligono);
                    L.geoJSON(geojsonData, {
                        style: { color: '#1e7e34', weight: 2, fillColor: '#28a745', fillOpacity: 0.3 }
                    }).bindPopup(`<b>${sitio.nombre_zona}</b>`).addTo(dashMap);
                } catch(e) { 
                    console.error("Error en polígono", e); 
                }
            }
        });

        const treeIcon = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png', 
            iconSize: [25, 25], 
            iconAnchor: [12, 25], 
            popupAnchor: [0, -25]
        });

        if(arboles) {
            arboles.forEach(arbol => {
                const lat = parseFloat(arbol.latitud);
                const lng = parseFloat(arbol.longitud);
                
                if (!isNaN(lat) && !isNaN(lng)) {
                    let color = arbol.estado === 'Malo' ? 'red' : (arbol.estado === 'Regular' ? 'orange' : 'green');
                    let popupHtml = `<div class='text-center'><b>${arbol.nombre_comun}</b><br><span style='color:${color}'>${arbol.estado || 'Sin Revisión'}</span></div>`;
                
                    L.marker([lat, lng], {icon: treeIcon})
                     .addTo(dashMap)
                     .bindPopup(popupHtml);
                }
            });
        }
    } catch (error) {
        console.error("Error cargando mapa del Dashboard:", error);
    }
}

window.generarTicketPDF = async function() {
    const ticketElement = document.getElementById('ticketPDF');
    if (!ticketElement) return alert("Error: No se encontró el diseño del ticket en el HTML.");

    try {
        const data = await ApiService.get('/trees/stats');
        
        document.getElementById('ticket-folio').innerText = 'UTM-' + Date.now().toString().slice(-4);
        document.getElementById('ticket-fecha').innerText = new Date().toLocaleDateString();
        document.getElementById('ticket-total').innerText = data.totalArboles;
        document.getElementById('ticket-sanos').innerText = data.totalSanos;
        document.getElementById('ticket-riesgo').innerText = data.totalArboles - data.totalSanos;
        
        const salud = data.totalArboles > 0 ? Math.round((data.totalSanos / data.totalArboles) * 100) : 0;
        document.getElementById('ticket-porcentaje').innerText = salud + '%';
        
        ticketElement.style.display = 'block';
        
        const opt = {
            margin:       10,
            filename:     'Ticket_ArboMap_Real.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a5', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(ticketElement).save().then(() => {
            ticketElement.style.display = 'none'; 
        });
    } catch (err) {
        console.error("Error al generar ticket:", err);
        alert("Error al generar los datos del ticket.");
    }
}

function generarGrafica(b, r, m) {
    if(chartPie) chartPie.destroy();
    
    const canvas = document.getElementById("myPieChart");
    if(canvas) {
        chartPie = new Chart(canvas, {
            type: 'doughnut',
            data: { 
                labels: ["Bueno", "Regular", "Malo"], 
                datasets: [{ data: [b, r, m], backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b'] }] 
            },
            options: { maintainAspectRatio: false, legend: { display: false }, cutoutPercentage: 80 }
        });
    }
}