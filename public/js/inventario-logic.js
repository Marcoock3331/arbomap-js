// UBICACIÓN: public/js/inventario-logic.js

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Cargar el menú lateral
    fetch('components/sidebar.html')
        .then(response => response.text())
        .then(html => document.getElementById('sidebar-container').innerHTML = html);

    // 2. Cargar los datos de la tabla y zonas automáticamente
    cargarTablaInventario();
    cargarZonas();

    // 3. Preparar el formulario de "Agregar Árbol"
    document.getElementById('formAgregarArbol').addEventListener('submit', function(e) {
        e.preventDefault(); 
        
        const formData = new FormData(this);
        const btnGuardar = this.querySelector('button[type="submit"]');
        const textoOriginal = btnGuardar.innerHTML;
        
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        fetch('/api/arboles', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('🌳 ' + data.message); 
                $('#modalNuevoArbol').modal('hide'); 
                this.reset(); 
                cargarTablaInventario(); 
            } else {
                alert('❌ Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('❌ Error al conectar con el servidor.');
        })
        .finally(() => {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        });
    });

    // 4. Preparar el formulario de "Nuevo Reporte"
    document.getElementById('formSeguimiento').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const btnGuardar = this.querySelector('button[type="submit"]');
        const textoOriginal = btnGuardar.innerHTML;
        
        btnGuardar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        fetch('/api/seguimiento', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('📸 ' + data.message);
                $('#modalSeguimiento').modal('hide'); 
                this.reset(); 
                cargarTablaInventario(); 
            } else {
                alert('❌ Error: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('❌ Error al conectar con el servidor.');
        })
        .finally(() => {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        });
    });
});

// --- FUNCIÓN PARA LLENAR LA TABLA ---
function cargarTablaInventario() {
    fetch('/api/dashboard-stats')
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('tabla-arboles');
            tbody.innerHTML = ''; 

            data.arboles.forEach((arbol, index) => {
                let estado = arbol.estado || 'Sin revisión';
                let badgeColor = 'secondary';
                if(estado === 'Bueno') badgeColor = 'success';
                if(estado === 'Regular') badgeColor = 'warning';
                if(estado === 'Malo') badgeColor = 'danger';

                let foto = arbol.foto_actual ? `/uploads/${arbol.foto_actual}` : 'https://cdn-icons-png.flaticon.com/512/10521/10521236.png';

                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td class="align-middle font-weight-bold text-center text-gray-500">${index + 1}</td>
                    
                    <td class="align-middle text-center">
                        <img src="${foto}" class="img-arbol-tabla" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
                    </td>
                    
                    <td class="align-middle">
                        <div class="font-weight-bold text-success mb-1">${arbol.nombre_comun}</div>
                        <div class="small text-muted font-italic">${arbol.nombre_cientifico || 'Sin nombre científico'}</div>
                        <span class="badge badge-light border border-secondary text-dark mt-1">${arbol.codigo_etiqueta}</span>
                    </td>
                    
                    <td class="align-middle">${arbol.nombre_zona || 'Campus General'}</td>
                    
                    <td class="align-middle small text-gray-500">
                        <i class="fas fa-location-arrow fa-xs mr-1"></i>Lat: ${parseFloat(arbol.latitud).toFixed(4)}<br>
                        <i class="fas fa-location-arrow fa-xs mr-1"></i>Lng: ${parseFloat(arbol.longitud).toFixed(4)}
                    </td>
                    
                    <td class="align-middle text-center">
                        <span class="badge badge-${badgeColor} px-3 py-2 rounded-pill">${estado}</span>
                    </td>
                    
                    <td class="align-middle text-center">
                        <button class="btn btn-info btn-sm btn-circle shadow-sm" onclick="abrirModalReporte('${arbol.codigo_etiqueta}', '${arbol.nombre_comun}')">
                            <i class="fas fa-camera"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(err => {
            console.error('Error cargando la tabla:', err);
            document.getElementById('tabla-arboles').innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error al cargar los datos</td></tr>';
        });
}

// --- FUNCIÓN PARA LLENAR EL SELECT DE ZONAS ---
function cargarZonas() {
    fetch('/api/sitios')
        .then(response => response.json())
        .then(sitios => {
            const select = document.getElementById('select-sitios');
            select.innerHTML = '<option value="" disabled selected>Selecciona una zona...</option>';
            
            sitios.forEach(sitio => {
                select.innerHTML += `<option value="${sitio.id_sitio}">${sitio.nombre_zona}</option>`;
            });
        })
        .catch(error => {
            console.error("Error cargando las zonas:", error);
            document.getElementById('select-sitios').innerHTML = '<option value="">Error al cargar zonas</option>';
        });
}

// --- FUNCIÓN PARA ABRIR EL MODAL DE REPORTE ---
window.abrirModalReporte = function(idArbol, nombreArbol) {
    document.getElementById('inputIDArbol').value = idArbol;
    document.getElementById('tituloModalSeguimiento').innerText = 'Reporte para: ' + nombreArbol;
    $('#modalSeguimiento').modal('show');
};