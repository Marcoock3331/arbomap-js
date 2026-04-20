document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');

    try {
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        if (res.ok) {
            const html = await res.text();
            sidebarContainer.innerHTML = html;
        }
    } catch (err) { console.error("Error sidebar:", err); }
    finally { setTimeout(mostrarPagina, 100); }

    cargarReforestaciones();

    document.getElementById('formPropuesta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            await ApiService.post('/campaigns', data);
            $('#modalPropuesta').modal('hide');
            e.target.reset();
            ApiService.toast('success', '¡Propuesta enviada exitosamente!');
            cargarReforestaciones();
        } catch (err) {}
    });

    document.getElementById('formAprobar').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const idPropuesta = document.getElementById('aprobar-id').value;
        try {
            await ApiService.post(`/campaigns/${idPropuesta}/approve`, data);
            $('#modalAprobar').modal('hide');
            ApiService.toast('success', '¡Campaña aprobada y activa!');
            cargarReforestaciones();
        } catch (err) {}
    });

    document.getElementById('formEditarCampana').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const id = document.getElementById('edit-id').value;
        try {
            await ApiService.put(`/campaigns/${id}`, data);
            $('#modalEditarCampana').modal('hide');
            ApiService.toast('success', '¡Campaña actualizada!');
            cargarReforestaciones();
        } catch (err) {}
    });
});

async function cargarReforestaciones() {
    const contenedor = document.getElementById('contenedor-campanas');
    contenedor.innerHTML = `<tr><td colspan="6" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></td></tr>`;
    try {
        const campanas = await ApiService.get('/campaigns');
        const userStr = sessionStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const isAdmin = user && user.id_rol === 1;

        if (!campanas || campanas.length === 0) {
            contenedor.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No hay campañas registradas.</td></tr>`;
            return;
        }

        contenedor.innerHTML = campanas.map(c => {
            const plantados = c.cantidad_plantada ?? 0;
            const meta = c.cantidad_meta ?? 1;
            const pct = Math.min(Math.round((plantados / meta) * 100), 100);
            const esPropuesta = !c.id_reforestacion;

            const badgePropuesta = esPropuesta 
                ? `<span class="badge badge-warning px-3 py-1 shadow-sm" style="font-size: 0.85rem;">Propuesta</span>` 
                : `<span class="badge badge-success px-3 py-1 shadow-sm" style="font-size: 0.85rem;">Aprobada</span>`;
            
            const badgeEstado = !esPropuesta ? `<br><small class="text-muted font-weight-bold">${c.estado}</small>` : '';

            let acciones = '';
            // NUEVO: Agregamos el botón de borrar también a las propuestas
            if (esPropuesta && isAdmin) {
                acciones = `
                    <button class="btn btn-sm btn-outline-primary rounded-circle shadow-sm" onclick="abrirAprobar(${c.id_propuesta}, ${c.cantidad_meta})" title="Aprobar"><i class="fas fa-check"></i></button>
                    <button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm mx-1" onclick="eliminarPropuesta(${c.id_propuesta})" title="Eliminar Propuesta"><i class="fas fa-trash"></i></button>
                `;
            } else if (!esPropuesta) {
                acciones += `
                    <button class="btn btn-sm btn-outline-warning rounded-circle shadow-sm mx-1" onclick="abrirEditarCampana(${c.id_reforestacion})" title="Editar"><i class="fas fa-edit"></i></button>
                    ${isAdmin ? `<button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm" onclick="eliminarCampana(${c.id_reforestacion})" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                `;
            }

            return `
            <tr>
                <td class="font-weight-bold text-muted align-middle">${c.id_propuesta}</td>
                <td class="font-weight-bold text-success align-middle">${c.nombre_propuesta}</td>
                <td class="align-middle">${c.nombre_zona ?? '<span class="text-muted font-italic">Sin asignar</span>'}</td>
                <td class="align-middle">
                    <div class="progress mb-1 shadow-sm" style="height:8px;">
                        <div class="progress-bar bg-success" style="width:${pct}%"></div>
                    </div>
                    <small class="text-muted font-weight-bold">${plantados} de ${meta} árboles</small>
                </td>
                <td class="align-middle">${badgePropuesta}${badgeEstado}</td>
                <td class="align-middle">${acciones}</td>
            </tr>`;
        }).join('');
    } catch (err) { 
        contenedor.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error al cargar datos.</td></tr>`;
    }
}

window.abrirAprobar = async (id, meta) => {
    document.getElementById('aprobar-id').value = id;
    document.getElementById('aprobar-meta').value = meta;
    try {
        const sitios = await ApiService.get('/sites');
        const sel = document.getElementById('select-sitios');
        sel.innerHTML = sitios.map(s => `<option value="${s.id_sitio}">${s.nombre_zona}</option>`).join('');
        $('#modalAprobar').modal('show');
    } catch (err) {}
};

window.abrirEditarCampana = async (id_reforestacion) => {
    try {
        const sitios = await ApiService.get('/sites');
        const sel = document.getElementById('edit-sitio');
        sel.innerHTML = sitios.map(s => `<option value="${s.id_sitio}">${s.nombre_zona}</option>`).join('');

        const data = await ApiService.get(`/campaigns/${id_reforestacion}`);
        const camp = data.campana;
        document.getElementById('edit-id').value = camp.id_reforestacion;
        document.getElementById('edit-nombre').value = camp.nombre_propuesta;
        document.getElementById('edit-meta').value = camp.cantidad_meta;
        if (camp.id_sitio) document.getElementById('edit-sitio').value = camp.id_sitio;
        if (camp.fecha_evento) document.getElementById('edit-fecha').value = camp.fecha_evento.split('T')[0];

        $('#modalEditarCampana').modal('show');
    } catch (err) {}
};

// ==========================================
// UX MEJORADA: SWEETALERT2 PARA ELIMINAR
// ==========================================

window.eliminarCampana = async (id) => {
    const result = await Swal.fire({
        title: '¿Deshacer Campaña?',
        text: "La campaña regresará a ser una Propuesta y los árboles plantados se irán al inventario general.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: '<i class="fas fa-undo mr-1"></i> Sí, deshacer',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        await ApiService.delete(`/campaigns/${id}`);
        ApiService.toast('success', 'Campaña deshecha exitosamente.');
        cargarReforestaciones();
    } catch (err) {}
};

// NUEVA FUNCIÓN PARA ELIMINAR PROPUESTAS COMPLETAMENTE
window.eliminarPropuesta = async (id_propuesta) => {
    const result = await Swal.fire({
        title: '¿Borrar Propuesta?',
        text: "Esta acción eliminará la propuesta por completo de la base de datos de la UTM.",
        icon: 'error',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: '<i class="fas fa-trash mr-1"></i> Sí, borrar definitivamente',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
        // Asumiendo una ruta genérica para borrar propuestas. 
        await ApiService.delete(`/campaigns/proposal/${id_propuesta}`); 
        ApiService.toast('success', 'Propuesta eliminada definitivamente.');
        cargarReforestaciones();
    } catch (err) {}
};