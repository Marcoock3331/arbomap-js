// public/js/dashboard-main.js
import { MapModule } from './map-module.js';
import { UIModule } from './ui-module.js';

// Exponemos la función de logout al entorno global (para el sidebar)
window.cerrarSesion = function(e) { 
    if(e) e.preventDefault(); 
    sessionStorage.clear(); 
    window.location.replace('login.html'); 
};

document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');

    // 1. Cargar la barra lateral
    try {
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        const html = await res.text();
        sidebarContainer.innerHTML = html;
    } catch (err) { 
        console.error("Error sidebar:", err);
    } finally { 
        setTimeout(mostrarPagina, 100); 
    }

    // 2. Inicializar los Módulos
    await initializeDashboard();
});

async function initializeDashboard() {
    try {
        // Pedimos TODOS los datos al servidor de una sola vez
        const [statsData, sitesData] = await Promise.all([
            ApiService.get('/trees/stats'),
            ApiService.get('/sites')
        ]);

        // A. Actualizamos Contadores y Gráfica
        UIModule.updateCounters(statsData);
        UIModule.renderChart('myPieChart', statsData.totalArboles, statsData.totalSanos);

        // B. Inicializamos el Mapa y dibujamos las cosas
        MapModule.initMap('dashboardMap');
        MapModule.loadZones(sitesData);
        MapModule.loadMarkers(statsData.arboles);

        // C. Conectamos el botón del Ticket al Módulo UI
        const btnTicket = document.getElementById('btn-imprimir-ticket');
        if (btnTicket) {
            btnTicket.addEventListener('click', () => {
                UIModule.generatePDF(statsData);
            });
        }

    } catch (error) {
        console.error("Error inicializando el Dashboard:", error);
        alert("Ocurrió un error al cargar la información del panel.");
    }
}