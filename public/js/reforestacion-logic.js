document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');

    try {
        const res = await fetch('components/sidebar.html');
        const html = await res.text();
        sidebarContainer.innerHTML = html;
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
            cargarReforestaciones();
        } catch (err) { alert(err.message); }
    });

    document.getElementById('formAprobar').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const idPropuesta = document.getElementById('aprobar-id').value;
        try {
            await ApiService.post(`/campaigns/${idPropuesta}/approve`, data);
            $('#modalAprobar').modal('hide');
            cargarReforestaciones();
        } catch (err) { alert(err.message); }
    });

    document.getElementById('formEditarCampana').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        const id = document.getElementById('edit-id').value;
        try {
            await ApiService.put(`/campaigns/${id}`, data);
            $('#modalEditarCampana').modal('hide');
            cargarReforestaciones();
        } catch (err) { alert(err.message); }
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
            const plantados = c.cantidad_plantada || 0;
            const meta = c.cantidad_meta || 1;
            const pct = Math.min(Math.round((plantados / meta) * 100), 100);
            const esPropuesta = !c.id_reforestacion;

            const badgePropuesta = esPropuesta 
                ? `<span class="badge badge-warning">Propuesta</span>` 
                : `<span class="badge badge-success">Aprobada</span>`;
            
            const badgeEstado = !esPropuesta ? `<br><small class="text-muted">${c.estado}</small>` : '';

            let acciones = '';
            if (esPropuesta && isAdmin) {
                acciones = `<button class="btn btn-sm btn-outline-primary rounded-circle" onclick="abrirAprobar(${c.id_propuesta}, ${c.cantidad_meta})" title="Aprobar"><i class="fas fa-check"></i></button>`;
            } else if (!esPropuesta) {
                acciones += `
                    <button class="btn btn-sm btn-outline-warning rounded-circle mx-1" onclick="abrirEditarCampana(${c.id_reforestacion})" title="Editar"><i class="fas fa-edit"></i></button>
                    ${isAdmin ? `<button class="btn btn-sm btn-outline-danger rounded-circle" onclick="eliminarCampana(${c.id_reforestacion})" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                `;
            }

            return `
            <tr>
                <td class="font-weight-bold text-muted">${c.id_propuesta}</td>
                <td class="font-weight-bold text-success">${c.nombre_propuesta}</td>
                <td>${c.nombre_zona || '<span class="text-muted">Sin asignar</span>'}</td>
                <td>
                    <div class="progress mb-1" style="height:10px;">
                        <div class="progress-bar bg-success" style="width:${pct}%"></div>
                    </div>
                    <small class="text-muted">${plantados} de ${meta} árboles</small>
                </td>
                <td>${badgePropuesta}${badgeEstado}</td>
                <td>${acciones}</td>
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
    } catch (err) { alert(err.message); }
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
    } catch (err) { alert(err.message); }
};

window.eliminarCampana = async (id) => {
    if(!confirm("¿Estás seguro? La campaña se borrará, pero los árboles plantados se conservarán en el inventario general.")) return;
    try {
        await ApiService.delete(`/campaigns/${id}`);
        cargarReforestaciones();
    } catch (err) { alert(err.message); }
};