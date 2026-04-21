let todosLosPadrinos = [];

document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    try {
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        const html = await res.text();
        sidebarContainer.innerHTML = html;
        document.body.classList.add('listo');
    } catch (err) {
        document.body.classList.add('listo');
    }

    cargarDirectorio();
});

async function cargarDirectorio() {
    try {
        const data = await ApiService.get('/padrinos/directorio'); 
        todosLosPadrinos = data;
        
        llenarSelectsFiltros(data);
        renderizarTabla(data);
    } catch (e) {
        document.getElementById('tbody-padrinos').innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar el directorio.</td></tr>`;
    }
}

function llenarSelectsFiltros(datos) {
    const selCarrera = document.getElementById('filtro-carrera');
    const selCuatri = document.getElementById('filtro-cuatrimestre');
    
    // Extraemos carreras y cuatrimestres únicos que no sean nulos
    const carreras = [...new Set(datos.map(d => d.carrera).filter(c => c))];
    const cuatris = [...new Set(datos.map(d => d.cuatrimestre).filter(c => c))].sort((a,b) => a - b);
    
    selCarrera.innerHTML = '<option value="Todas">Todas las Carreras</option>';
    carreras.forEach(c => selCarrera.innerHTML += `<option value="${c}">${c}</option>`);
    
    selCuatri.innerHTML = '<option value="Todos">Todos</option>';
    cuatris.forEach(c => selCuatri.innerHTML += `<option value="${c}">Cuatrimestre ${c}</option>`);
}

function aplicarFiltros() {
    const fCarrera = document.getElementById('filtro-carrera').value;
    const fCuatri = document.getElementById('filtro-cuatrimestre').value;
    
    const filtrados = todosLosPadrinos.filter(p => {
        const cumpleCarrera = (fCarrera === 'Todas') || (p.carrera === fCarrera);
        const cumpleCuatri = (fCuatri === 'Todos') || (p.cuatrimestre == fCuatri);
        return cumpleCarrera && cumpleCuatri;
    });
    
    renderizarTabla(filtrados);
}

function limpiarFiltros() {
    document.getElementById('filtro-carrera').value = 'Todas';
    document.getElementById('filtro-cuatrimestre').value = 'Todos';
    renderizarTabla(todosLosPadrinos);
}

function renderizarTabla(lista) {
    const tbody = document.getElementById('tbody-padrinos');
    const titulo = document.getElementById('titulo-resultados');
    
    titulo.innerText = `Directorio Estudiantil (${lista.length} registros)`;
    tbody.innerHTML = '';
    
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5 font-italic">No se encontraron alumnos con esos filtros.</td></tr>`;
        return;
    }

    lista.forEach(p => {
        const arboles = p.arboles_a_cargo || 0;
        const colorBadge = arboles > 0 ? 'success' : 'secondary';
        
        tbody.innerHTML += `
            <tr class="border-bottom animate__animated animate__fadeIn">
                <td class="pl-4 font-weight-bold text-gray-800 align-middle">${p.matricula}</td>
                <td class="align-middle text-gray-700">${p.nombre_completo}</td>
                <td class="align-middle">
                    <div class="text-gray-700">${p.carrera || '<span class="text-muted font-italic">Sin especificar</span>'}</div>
                    <small class="text-muted">Cuatrimestre ${p.cuatrimestre || 'N/A'}</small>
                </td>
                <td class="text-center align-middle">
                    <span class="badge badge-${colorBadge} rounded-pill px-3 py-2 shadow-sm" style="font-size: 0.9rem;">
                        <i class="fas fa-tree mr-1"></i> ${arboles}
                    </span>
                </td>
                <td class="text-center align-middle">
                    <button class="btn btn-outline-info btn-sm rounded-pill shadow-sm font-weight-bold px-3 mb-1" onclick="verArbolesPadrino(${p.id_usuario}, '${p.nombre_completo}')">
                        <i class="fas fa-eye mr-1"></i> Ver Árboles
                    </button>
                    <button class="btn btn-outline-danger btn-sm rounded-pill shadow-sm font-weight-bold px-3 mb-1" onclick="egresarPadrino(${p.id_usuario}, '${p.nombre_completo}')">
                        <i class="fas fa-graduation-cap mr-1"></i> Egresar y Liberar
                    </button>
                </td>
            </tr>`;
    });
}

// ==========================================
// ACCIÓN: VER ÁRBOLES DEL PADRINO
// ==========================================
window.verArbolesPadrino = async function(id_usuario, nombre) {
    try {
        const arboles = await ApiService.get(`/padrinos/${id_usuario}/arboles`);
        
        if (arboles.length === 0) {
            return ApiService.toast('info', 'Este alumno no tiene árboles asignados actualmente.');
        }

        // Armamos una lista HTML limpia para el SweetAlert
        let htmlLista = '<div class="text-left"><ul class="list-group shadow-sm" style="border-radius: 10px;">';
        arboles.forEach(a => {
            htmlLista += `
                <li class="list-group-item d-flex justify-content-between align-items-center border-0 mb-1 bg-light" style="border-radius: 8px;">
                    <div>
                        <strong class="text-success">${a.nombre_comun || 'Especie no registrada'}</strong><br>
                        <small class="text-muted"><i class="fas fa-map-marker-alt mr-1"></i>${a.nombre_zona || 'Zona sin asignar'}</small>
                    </div>
                    <span class="badge badge-info badge-pill px-3 py-2 shadow-sm">${a.codigo_etiqueta}</span>
                </li>`;
        });
        htmlLista += '</ul></div>';

        Swal.fire({
            title: `<h5 class="font-weight-bold text-gray-800 mb-0">Árboles a cargo de<br><span class="text-primary">${nombre}</span></h5>`,
            html: htmlLista,
            showCloseButton: true,
            showConfirmButton: false,
            customClass: { popup: 'rounded-lg shadow-lg' }
        });
    } catch (e) {
        // ApiService ya muestra el error visual
    }
};

// ==========================================
// ACCIÓN: EGRESAR
// ==========================================
window.egresarPadrino = async function(id_usuario, nombre) {
    const result = await Swal.fire({
        title: '¿Egresar Alumno?',
        html: `Estás a punto de egresar a <b>${nombre}</b>.<br><br>Su cuenta será desactivada y todos los árboles que cuidaba regresarán al inventario general para que otro voluntario los adopte.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: '<i class="fas fa-graduation-cap mr-1"></i> Sí, Egresar y Liberar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        await ApiService.delete(`/padrinos/egresar/${id_usuario}`);
        ApiService.toast('success', '¡Alumno egresado exitosamente!');
        cargarDirectorio(); // Recargamos la tabla
    } catch (e) {
        // Error manejado por ApiService
    }
};