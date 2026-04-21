document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');

    try {
        const res = await fetch('components/sidebar.html?v=' + new Date().getTime());
        if (res.ok) sidebarContainer.innerHTML = await res.text();
    } catch (err) { }
    finally { setTimeout(mostrarPagina, 100); }

    cargarReforestaciones();

    // Eventos de Formularios
    document.getElementById('formPropuesta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            await ApiService.post('/campaigns', data);
            $('#modalPropuesta').modal('hide'); e.target.reset();
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
            ApiService.toast('success', '¡Campaña aprobada y logística creada!');
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
    contenedor.innerHTML = `<tr><td colspan="5" class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x text-muted"></i></td></tr>`;
    
    try {
        const campanas = await ApiService.get('/campaigns');
        const userStr = sessionStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const isAdmin = user && user.id_rol === 1;

        if (!campanas || campanas.length === 0) {
            contenedor.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-5">No hay campañas registradas.</td></tr>`;
            return;
        }

        contenedor.innerHTML = campanas.map(c => {
            const plantados = c.cantidad_plantada ?? 0;
            const meta = c.cantidad_meta ?? 1;
            const pctArboles = Math.min(Math.round((plantados / meta) * 100), 100);
            const esPropuesta = !c.id_reforestacion;

            // Textos de Logística
            const fEvento = c.fecha_evento ? new Date(c.fecha_evento).toLocaleDateString() : 'Por definir';
            const logistica = !esPropuesta ? `
                <div class="small"><i class="fas fa-calendar-alt text-primary mr-1"></i> ${fEvento}</div>
                <div class="small"><i class="fas fa-map-marker-alt text-danger mr-1"></i> ${c.punto_reunion || 'Explanada Principal'}</div>
            ` : '<span class="text-muted font-italic small">Logística pendiente</span>';

            // Textos de Progreso
            const cuposInfo = !esPropuesta ? `
                <div class="small text-muted font-weight-bold mt-2">
                    <i class="fas fa-users text-info mr-1"></i> Voluntarios: ${c.inscritos || 0} / ${c.cupo_maximo || 20}
                </div>` : '';

            // Etiquetas de Estado
            const badgePropuesta = esPropuesta 
                ? `<span class="badge badge-warning px-3 py-1 shadow-sm">Propuesta</span>` 
                : `<span class="badge badge-success px-3 py-1 shadow-sm">Aprobada</span>`;
            const badgeEstado = !esPropuesta ? `<br><small class="text-muted font-weight-bold">${c.estado}</small>` : '';

            // ==========================================
            // LÓGICA DE BOTONES SEGÚN ROL
            // ==========================================
            let acciones = `<div class="d-flex justify-content-center align-items-center">`;
            
            if (isAdmin) {
                if (esPropuesta) {
                    acciones += `
                        <button class="btn btn-sm btn-outline-primary rounded-circle shadow-sm mr-1" onclick="abrirAprobar(${c.id_propuesta}, ${c.cantidad_meta})" title="Aprobar y Organizar"><i class="fas fa-check"></i></button>
                        <button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm" onclick="eliminarPropuesta(${c.id_propuesta})" title="Rechazar"><i class="fas fa-times"></i></button>`;
                } else {
                    acciones += `
                        <button class="btn btn-sm btn-outline-info rounded-circle shadow-sm mr-1" onclick="abrirAsistencia(${c.id_reforestacion})" title="Pase de Lista"><i class="fas fa-clipboard-list"></i></button>
                        <button class="btn btn-sm btn-outline-warning rounded-circle shadow-sm mr-1" onclick="abrirEditarCampana(${c.id_reforestacion})" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger rounded-circle shadow-sm mr-1" onclick="eliminarCampana(${c.id_reforestacion})" title="Eliminar"><i class="fas fa-trash"></i></button>`;
                }
            } else {
                // Vista Voluntario
                if (esPropuesta) {
                    acciones += `<span class="badge badge-light text-muted border px-2 py-1">En revisión</span>`;
                } else {
                    const isFull = (c.inscritos || 0) >= (c.cupo_maximo || 999);
                    if (isFull) {
                        acciones += `<button class="btn btn-sm btn-secondary rounded-pill shadow-sm font-weight-bold disabled mr-1">Cupo Lleno</button>`;
                    } else {
                        acciones += `<button class="btn btn-sm btn-success rounded-pill shadow-sm font-weight-bold mr-1" onclick="unirseCampana(${c.id_reforestacion})" title="¡Inscribirme!"><i class="fas fa-hand-paper mr-1"></i> Unirme</button>`;
                    }
                }
            }

            // Botón de Ver Detalles (Árboles) para ambos si ya está aprobada
            if (!esPropuesta) {
                acciones += `<a href="detalles_reforestacion.html?id=${c.id_reforestacion}" class="btn btn-sm btn-outline-dark rounded-circle shadow-sm" title="Ver Árboles Plantados"><i class="fas fa-tree"></i></a>`;
            }

            acciones += `</div>`;

            return `
            <tr class="border-bottom">
                <td class="align-middle">
                    <div class="font-weight-bold text-success">${c.nombre_propuesta}</div>
                    <div class="small text-muted"><i class="fas fa-map-pin mr-1"></i>${c.nombre_zona ?? 'Sin asignar'}</div>
                </td>
                <td class="align-middle">${logistica}</td>
                <td class="align-middle">
                    <div class="progress mb-1 shadow-sm" style="height:6px;">
                        <div class="progress-bar bg-success" style="width:${pctArboles}%"></div>
                    </div>
                    <small class="text-muted font-weight-bold">${plantados} / ${meta} árboles</small>
                    ${cuposInfo}
                </td>
                <td class="align-middle text-center">${badgePropuesta}${badgeEstado}</td>
                <td class="align-middle">${acciones}</td>
            </tr>`;
        }).join('');
    } catch (err) { 
        contenedor.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar campañas.</td></tr>`;
    }
}

// ==========================================
// NUEVAS FUNCIONES PARA VOLUNTARIOS Y ADMIN
// ==========================================

window.unirseCampana = async (id) => {
    const result = await Swal.fire({
        title: '¿Confirmar Asistencia?',
        text: "Te comprometes a asistir a esta campaña en la fecha y punto de reunión indicados.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#1cc88a',
        cancelButtonColor: '#858796',
        confirmButtonText: '<i class="fas fa-check mr-1"></i> Sí, me apunto',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await ApiService.post(`/campaigns/${id}/unirse`);
            ApiService.toast('success', '¡Excelente! Estás inscrito en el evento.');
            cargarReforestaciones();
        } catch (err) {}
    }
};

window.abrirAsistencia = async (id_reforestacion) => {
    const tbody = document.getElementById('tbody-asistencia');
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4"><i class="fas fa-spinner fa-spin text-muted"></i></td></tr>`;
    $('#modalAsistencia').modal('show');

    try {
        const voluntarios = await ApiService.get(`/campaigns/${id_reforestacion}/voluntarios`);
        if (voluntarios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted font-italic py-4">Aún no hay voluntarios inscritos.</td></tr>`;
            return;
        }

        tbody.innerHTML = voluntarios.map(v => `
            <tr>
                <td class="pl-4 align-middle font-weight-bold text-gray-700">${v.matricula || 'N/A'}</td>
                <td class="align-middle">
                    <div class="text-dark">${v.nombre_completo}</div>
                </td>
                <td class="text-center align-middle">
                    <div class="custom-control custom-switch">
                        <input type="checkbox" class="custom-control-input" id="check-${v.id_registro}" 
                               ${v.asistio ? 'checked' : ''} 
                               onchange="marcarAsistencia(${v.id_registro}, this.checked)">
                        <label class="custom-control-label" for="check-${v.id_registro}"></label>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Error al cargar la lista.</td></tr>`;
    }
};

window.marcarAsistencia = async (idRegistro, asistio) => {
    try {
        await ApiService.put(`/campaigns/asistencia/${idRegistro}`, { asistio: asistio ? 1 : 0 });
        ApiService.toast('success', asistio ? 'Asistencia confirmada' : 'Falta registrada');
    } catch (e) {
        // Revertir el switch si falla
        document.getElementById(`check-${idRegistro}`).checked = !asistio;
    }
};

// --- Funciones originales conservadas ---
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
        $('#modalEditarCampana').modal('show');
    } catch (err) {}
};

window.eliminarCampana = async (id) => {
    const r = await Swal.fire({ title: '¿Deshacer Campaña?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, deshacer' });
    if(r.isConfirmed) { await ApiService.delete(`/campaigns/${id}`); cargarReforestaciones(); }
};

window.eliminarPropuesta = async (id_propuesta) => {
    const r = await Swal.fire({ title: '¿Borrar Propuesta?', icon: 'error', showCancelButton: true, confirmButtonText: 'Borrar definitivamente' });
    if(r.isConfirmed) { await ApiService.delete(`/campaigns/proposal/${id_propuesta}`); cargarReforestaciones(); }
};