document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cargar el menú lateral
    fetch('components/sidebar.html')
        .then(response => response.text())
        .then(html => document.getElementById('sidebar-container').innerHTML = html);

    // 2. Inicializar el Mapa de Leaflet
    var map = L.map('map').setView([19.7267, -101.1619], 16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Marcador Oficial del Campus
    var itmIcon = L.icon({
        iconUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Logotipo_ITM.png',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
    L.marker([19.7267, -101.1619], {icon: itmIcon}).addTo(map).bindPopup("<b>ITM</b><br>Campus Principal");

    // Icono para los árboles
    var treeIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png', 
        iconSize: [35, 35],
        iconAnchor: [17, 35]
    });

    // 3. Pedir los datos a nuestra API en Node.js
    // Reutilizamos el endpoint que ya nos trae todo (arboles, especie, estado)
    fetch('/api/dashboard-stats')
        .then(response => response.json())
        .then(data => {
            const arboles = data.arboles; // Usamos el array 'arboles' del JSON
            
            arboles.forEach(arbol => {
                var lat = parseFloat(arbol.latitud);
                var lng = parseFloat(arbol.longitud);

                if (!isNaN(lat) && !isNaN(lng)) {
                    // Dibujar marcador
                    var marker = L.marker([lat, lng], {icon: treeIcon}).addTo(map);
                    
                    // Asignar evento de clic a cada marcador
                    marker.on('click', () => {
                        mostrarFicha(arbol);
                    });
                }
            });
        })
        .catch(error => console.error("Error cargando el mapa:", error));

    // 4. Lógica de Interfaz (Ocultar/Mostrar ficha)
    function mostrarFicha(datos) {
        // Usamos jQuery (como en tu código original) para los efectos visuales
        $('#mensajeInicial').hide();
        $('#fichaTecnica').fadeIn();

        // Rellenar textos
        document.getElementById('fichaID').innerText = datos.codigo_etiqueta;
        document.getElementById('fichaNombreC').innerText = datos.nombre_cientifico || 'Desconocido';
        document.getElementById('fichaNombreComun').innerText = datos.nombre_comun;
        document.getElementById('fichaZona').innerText = datos.nombre_zona || "Zona General";

        // Estilar el estado (badge)
        let estado = datos.estado || "Sin revisión";
        let badgeColor = "secondary";
        if(estado === 'Bueno') badgeColor = "success";
        if(estado === 'Regular') badgeColor = "warning";
        if(estado === 'Malo') badgeColor = "danger";
        
        document.getElementById('fichaEstado').innerHTML = `<span class="badge badge-${badgeColor} px-3 py-2">${estado}</span>`;

        // Colocar foto
        let rutaFoto = datos.foto_actual ? `/uploads/${datos.foto_actual}` : "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?auto=format&fit=crop&w=400&q=80";
        document.getElementById('fichaFoto').src = rutaFoto;
    }

    // Botón para cerrar la ficha
    document.getElementById('btnCerrarFicha').addEventListener('click', () => {
        $('#fichaTecnica').fadeOut();
        $('#mensajeInicial').fadeIn();
    });

});