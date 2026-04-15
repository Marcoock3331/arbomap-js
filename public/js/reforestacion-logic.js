document.addEventListener('DOMContentLoaded', async () => {
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

    // FORMULARIO: NUEVA PROPUESTA
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
                e.target.reset();
                cargarReforestaciones();
            }
        } catch (err) { console.error("Error al enviar propuesta:", err); }
    });

    // FORMULARIO: APROBAR
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
    const contenedor = document.getElementById('contenedor-campanas');
    contenedor.innerHTML = `<tr><td colspan="7" class="text-center py-4">
        <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
    </td></tr>`;

    try {
        const res = await fetch('/api/reforestacion');  // ← ahora sí existe
        const campanas = await res.json();
        const user = JSON.parse(sessionStorage.getItem('user'));

        if (!Array.isArray(campanas) || campanas.length === 0) {
            contenedor.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
                No hay campañas registradas aún.
            </td></tr>`;
            return;
        }

        contenedor.innerHTML = campanas.map(c => {
            const plantados  = c.cantidad_plantada || 0;
            const meta       = c.cantidad_meta || 1;
            const pct        = Math.min(Math.round((plantados / meta) * 100), 100);
            const esPropuesta = !c.id_reforestacion; // sin campaña = solo propuesta

            // Badge de estado
            const badgePropuesta = esPropuesta
                ? `<span class="badge badge-warning px-2 py-1">Propuesta: ${c.estatus}</span>`
                : `<span class="badge badge-success px-2 py-1">Propuesta: ${c.estatus}</span>`;

            const badgeEstado = !esPropuesta
                ? `<br><small class="text-muted"><i class="fas fa-info-circle mr-1"></i>${c.estado}</small>`
                : '';

            // Fecha
            const fecha = c.fecha_evento
                ? new Date(c.fecha_evento).toLocaleDateString('es-MX')
                : '<span class="text-muted">Pendiente</span>';

            // Acciones
            const acciones = !esPropuesta
                ? `<a href="detalles_reforestacion.html?id=${c.id_reforestacion}" 
                      class="btn btn-sm btn-outline-secondary rounded-circle mr-1" title="Ver detalles">
                       <i class="fas fa-eye"></i>
                   </a>`
                : '';

            const btnAprobar = esPropuesta && user && user.id_rol === 1
                ? `<button class="btn btn-sm btn-outline-primary rounded-circle" 
                           onclick="abrirAprobar(${c.id_propuesta}, ${c.cantidad_meta})" 
                           title="Aprobar">
                       <i class="fas fa-check"></i>
                   </button>`
                : '';

            return `
            <tr>
                <td class="font-weight-bold text-muted">${c.id_propuesta}</td>
                <td>
                    <a href="${!esPropuesta ? `detalles_reforestacion.html?id=${c.id_reforestacion}` : '#'}" 
                       class="font-weight-bold text-utm text-decoration-none">
                        ${c.nombre_propuesta}
                    </a>
                </td>
                <td>${c.nombre_zona || '<span class="text-muted">Sin asignar</span>'}</td>
                <td>${fecha}</td>
                <td>
                    <div class="progress mb-1" style="height:10px; min-width:100px;">
                        <div class="progress-bar bg-success" style="width:${pct}%"></div>
                    </div>
                    <small class="text-muted">${plantados} de ${meta} árboles</small>
                </td>
                <td>${badgePropuesta}${badgeEstado}</td>
                <td>${acciones}${btnAprobar}</td>
            </tr>`;
        }).join('');

    } catch (err) { 
        console.error("Error al cargar campañas:", err);
        contenedor.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">
            Error al cargar campañas.
        </td></tr>`;
    }
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