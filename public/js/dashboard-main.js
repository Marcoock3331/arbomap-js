// public/js/dashboard-main.js
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

    // 2. Personalización: Saludo al usuario
    const userStr = sessionStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        // Usamos el nombre_completo (o nombre) y sacamos solo la primera palabra
        const nombreCampo = user.nombre_completo || user.nombre || "Usuario";
        const primerNombre = nombreCampo.split(' ')[0];
        document.getElementById('user-greeting').innerText = primerNombre;
    }

    // 3. Inicializar los datos del Dashboard
    await initializeDashboard();
});

async function initializeDashboard() {
    try {
        // Pedimos los datos al servidor
        const statsData = await ApiService.get('/trees/stats');

        // A. Actualizamos las Métricas Superiores
        const total = statsData.totalArboles || 0;
        const sanos = statsData.totalSanos || 0;
        
        document.getElementById('dash-total').innerText = total;
        
        let porcentajeSanos = 0;
        if (total > 0) {
            porcentajeSanos = Math.round((sanos / total) * 100);
        }
        document.getElementById('dash-sanos').innerText = `${porcentajeSanos}%`;
        document.getElementById('bar-sanos').style.width = `${porcentajeSanos}%`;

        // B. Clasificar la Salud y Dibujar Alertas
        let countBueno = 0, countRegular = 0, countMalo = 0;
        const arbolesEnfermos = [];

        if (statsData.arboles) {
            statsData.arboles.forEach(a => {
                const estado = a.estado ? a.estado.toLowerCase() : '';
                if (estado === 'bueno') {
                    countBueno++;
                } else if (estado === 'regular') {
                    countRegular++;
                    arbolesEnfermos.push(a);
                } else if (estado === 'malo') {
                    countMalo++;
                    arbolesEnfermos.push(a);
                }
            });
        }

        dibujarGraficaDona(countBueno, countRegular, countMalo);
        renderizarAlertas(arbolesEnfermos);

        // C. Conectamos el botón del Ticket al Módulo UI (Como lo tenías originalmente)
        const btnTicket = document.getElementById('btn-imprimir-ticket');
        if (btnTicket) {
            btnTicket.addEventListener('click', () => {
                if(UIModule && UIModule.generatePDF) {
                    UIModule.generatePDF(statsData);
                } else {
                    ApiService.toast('error', 'El módulo de PDF no está disponible.');
                }
            });
        }

    } catch (error) {
        console.error("Error inicializando el Dashboard:", error);
        document.getElementById('tbody-alertas').innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Ocurrió un error al cargar la información del panel.</td></tr>`;
    }
}

// ==========================================
// FUNCIONES DE RENDERIZADO VISUAL
// ==========================================

function dibujarGraficaDona(bueno, regular, malo) {
    const ctx = document.getElementById("saludChart");
    if (!ctx) return;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ["Bueno", "Regular", "Malo"],
            datasets: [{
                data: [bueno, regular, malo],
                backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b'],
                hoverBackgroundColor: ['#17a673', '#dda20a', '#be2617'],
                hoverBorderColor: "rgba(234, 236, 244, 1)",
            }],
        },
        options: {
            maintainAspectRatio: false,
            tooltips: {
                backgroundColor: "rgb(255,255,255)",
                bodyFontColor: "#858796",
                borderColor: '#dddfeb',
                borderWidth: 1,
                xPadding: 15,
                yPadding: 15,
                displayColors: false,
                caretPadding: 10,
            },
            legend: { display: false },
            cutoutPercentage: 70,
        },
    });
}

function renderizarAlertas(enfermos) {
    const tbody = document.getElementById('tbody-alertas');
    tbody.innerHTML = '';

    if (enfermos.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-success py-5"><i class="fas fa-check-circle fa-3x mb-3 opacity-50"></i><br>¡Excelente! Todos los árboles están sanos.</td></tr>`;
        return;
    }

    enfermos.forEach(a => {
        const badgeColor = a.estado.toLowerCase() === 'regular' ? 'warning' : 'danger';
        const icono = a.estado.toLowerCase() === 'regular' ? 'fa-exclamation-circle' : 'fa-times-circle';
        
        tbody.innerHTML += `
            <tr class="border-bottom">
                <td class="pl-4 align-middle">
                    <div class="font-weight-bold text-dark">${a.nombre_comun}</div>
                    <small class="text-muted"><i class="fas fa-tag mr-1"></i>${a.codigo_etiqueta}</small>
                </td>
                <td class="align-middle text-muted">
                    <i class="fas fa-map-marker-alt mr-1 text-primary"></i> ${a.nombre_zona || 'General'}
                </td>
                <td class="align-middle">
                    <span class="badge badge-${badgeColor} px-3 py-2 shadow-sm rounded-pill">
                        <i class="fas ${icono} mr-1"></i> ${a.estado.toUpperCase()}
                    </span>
                </td>
                <td class="text-center align-middle">
                    <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" class="btn btn-outline-info btn-sm rounded-pill font-weight-bold px-3 shadow-sm">
                        Ver Expediente
                    </a>
                </td>
            </tr>
        `;
    });
}