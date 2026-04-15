// UBICACION: public/js/dashboard-logic.js
let map, chartPie;

document.addEventListener('DOMContentLoaded', async () => {
    const sidebar = document.getElementById('sidebar-container');
    const mostrar = () => document.body.classList.add('listo');
    const cached = sessionStorage.getItem('sidebarHTML');
    if (cached) { sidebar.innerHTML = cached; } 
    else { const r = await fetch('components/sidebar.html'); const h = await r.text(); sessionStorage.setItem('sidebarHTML', h); sidebar.innerHTML = h; }
    setTimeout(mostrar, 100);

    map = L.map('dashboardMap').setView([19.7267, -101.1619], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    cargarTodo();
});

function cargarTodo() {
    fetch('/api/dashboard-stats').then(r => r.json()).then(data => {
        document.getElementById('total-arboles').innerText = data.totalArboles;
        document.getElementById('total-especies').innerText = data.totalEspecies;
        document.getElementById('total-sanos').innerText = data.totalSanos;

        let b = 0, r = 0, m = 0;
        const icon = L.divIcon({
            html: '<i class="fas fa-tree" style="color: #2e7d32; font-size: 24px; text-shadow: 1px 1px 3px rgba(0,0,0,0.4);"></i>',
            className: 'custom-tree', iconSize: [24, 24], iconAnchor: [12, 24]
        });

        data.arboles.forEach(a => {
            if (a.estado === 'Bueno') b++; else if (a.estado === 'Regular') r++; else if (a.estado === 'Malo') m++;
            if(a.latitud) L.marker([a.latitud, a.longitud], {icon}).bindPopup(`<b>${a.nombre_comun}</b><br>${a.codigo_etiqueta}`).addTo(map);
        });

        document.getElementById('count-bueno').innerText = b;
        document.getElementById('count-regular').innerText = r;
        document.getElementById('count-malo').innerText = m;
        generarGrafica(b, r, m);
    });

    fetch('/api/stats-zonas').then(r => r.json()).then(stats => {
        const tb = document.getElementById('tabla-stats-zonas');
        tb.innerHTML = '';
        stats.forEach(s => {
            let p = Math.round((s.sanos / s.total) * 100);
            let c = p > 70 ? 'success' : (p > 40 ? 'warning' : 'danger');
            tb.innerHTML += `<tr><td class="pl-3"><b>${s.nombre_zona}</b></td><td class="text-center">${s.total}</td><td class="text-center text-${c}"><b>${p}%</b></td></tr>`;
        });
    });

    fetch('/api/sitios').then(r => r.json()).then(zonas => {
        zonas.forEach(z => { if(z.coordenadas_poligono) L.geoJSON(JSON.parse(z.coordenadas_poligono), {style:{color:'#009688', weight:2, fillOpacity:0.1}}).addTo(map); });
    });
}

function generarGrafica(b, r, m) {
    if(chartPie) chartPie.destroy();
    chartPie = new Chart(document.getElementById("myPieChart"), {
        type: 'doughnut',
        data: { labels: ["Bueno", "Regular", "Malo"], datasets: [{ data: [b, r, m], backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b'] }] },
        options: { maintainAspectRatio: false, legend: { display: false }, cutoutPercentage: 80 }
    });
}