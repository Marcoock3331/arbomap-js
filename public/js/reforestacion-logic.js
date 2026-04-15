document.addEventListener('DOMContentLoaded', async () => {
    // 1. CARGA DE SIDEBAR
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');
    
    try {
        const cachedSidebar = sessionStorage.getItem('sidebarHTML');
        if (cachedSidebar) {
            sidebarContainer.innerHTML = cachedSidebar;
        } else {
            const res = await fetch('components/sidebar.html');
            const html = await res.text();
            sessionStorage.setItem('sidebarHTML', html);
            sidebarContainer.innerHTML = html;
        }
    } catch (err) { console.error("Error sidebar:", err); }
    finally { setTimeout(mostrarPagina, 100); }

    cargarReforestaciones();

    // 2. FORMULARIO: NUEVA PROPUESTA
    document.getElementById('formPropuesta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const res = await fetch('/api/reforestacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                $('#modalPropuesta').modal('hide');
                cargarReforestaciones();
            }
        } catch (err) { console.error("Error al enviar propuesta:", err); }
    });

    // 3. FORMULARIO: APROBAR (ADMIN)
    document.getElementById('formAprobar').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target).entries());
        try {
            const res = await fetch('/api/reforestacion/aprobar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                $('#modalAprobar').modal('hide');
                cargarReforestaciones();
            }
        } catch (err) { console.error("Error al aprobar:", err); }
    });
});

async function cargarReforestaciones() {
    try {
        const res = await fetch('/api/reforestacion');
        const campanas = await res.json();
        const contenedor = document.getElementById('contenedor-campanas');
        const user = JSON.parse(sessionStorage.getItem('user'));

        contenedor.innerHTML = '';

        if (campanas.length === 0) {
            contenedor.innerHTML = '<div class="col-12 text-center text-muted">No hay campañas registradas aún.</div>';
            return;
        }

        campanas.forEach(c => {
            const plantados = c.cantidad_plantada || 0;
            const meta = c.cantidad_meta || 1;
            const pct = Math.round((plantados / meta) * 100);
            
            const esPropuesta = c.estatus === 'Pendiente';
            const badgeColor = esPropuesta ? 'secondary' : (c.estado === 'Completada' ? 'success' : 'info');
            const statusLabel = esPropuesta ? 'PROPUESTA' : c.estado;

            contenedor.innerHTML += `
                <div class="col-xl-4 col-lg-6 mb-4">
                    <div class="card shadow-sm h-100 card-campana">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <h5 class="font-weight-bold text-dark mb-0">${c.nombre_propuesta}</h5>
                                <span class="badge badge-${badgeColor} px-2 py-1">${statusLabel}</span>
                            </div>
                            
                            <div class="small text-muted mb-3">
                                <div class="mb-1"><i class="fas fa-map-marker-alt mr-2 text-danger"></i>${c.nombre_zona || 'Sin zona asignada'}</div>
                                <div><i class="fas fa-calendar mr-2 text-primary"></i>${c.fecha_evento ? new Date(c.fecha_evento).toLocaleDateString() : 'Fecha pendiente'}</div>
                            </div>

                            <div class="mb-1 small font-weight-bold text-gray-800">Progreso: ${plantados} de ${meta} árboles</div>
                            <div class="progress mb-4 shadow-sm">
                                <div class="progress-bar bg-success" role="progressbar" style="width: ${Math.min(pct, 100)}%"></div>
                            </div>

                            <div class="d-flex justify-content-between">
                                ${!esPropuesta ? `
                                    <a href="detalles_reforestacion.html?id=${c.id_reforestacion}" class="btn btn-sm btn-outline-info rounded-circle shadow-sm" title="Ver Detalles">
                                        <i class="fas fa-eye"></i>
                                    </a>
                                ` : '<div></div>'}

                                ${esPropuesta && user.id_rol === 1 ? `
                                    <button class="btn btn-primary btn-sm rounded-pill px-3 font-weight-bold shadow-sm" onclick="abrirAprobar(${c.id_propuesta}, ${c.cantidad_meta})">
                                        Aprobar Campaña
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error("Error al cargar campañas:", err); }
}

window.abrirAprobar = async (id, meta) => {
    document.getElementById('aprobar-id').value = id;
    document.getElementById('aprobar-meta-temp').value = meta;

    try {
        const res = await fetch('/api/sitios');
        const sitios = await res.json();
        const sel = document.getElementById('select-sitios');
        sel.innerHTML = '';
        sitios.forEach(s => sel.innerHTML += `<option value="${s.id_sitio}">${s.nombre_zona}</option>`);
        $('#modalAprobar').modal('show');
    } catch (err) { console.error("Error cargando sitios:", err); }
};