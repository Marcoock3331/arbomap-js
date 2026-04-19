document.addEventListener('DOMContentLoaded', async () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    const mostrarPagina = () => document.body.classList.add('listo');
    
    try {
        const cachedSidebar = sessionStorage.getItem('sidebarHTML');
        if (cachedSidebar) {
            sidebarContainer.innerHTML = cachedSidebar;
        } else {
            const res = await fetch('components/sidebar.html');
            if(res.ok) {
                const html = await res.text();
                sessionStorage.setItem('sidebarHTML', html);
                sidebarContainer.innerHTML = html;
            }
        }
    } catch (err) {
        console.error("Error sidebar:", err);
    } finally {
        setTimeout(mostrarPagina, 100); 
    }

    const idCampana = new URLSearchParams(window.location.search).get('id');
    if (!idCampana) return window.location.href = "reforestacion.html";

    cargarDetallesCampana(idCampana);
});

async function cargarDetallesCampana(id) {
    try {
        const data = await ApiService.get(`/campaigns/${id}`);
        const c = data.campana;
        const arboles = data.arboles;

        const setEl = (idElemento, contenido) => {
            const el = document.getElementById(idElemento);
            if(el) el.innerHTML = contenido;
        };

        setEl('det-nombre-campana', c.nombre_propuesta);
        setEl('det-zona', c.nombre_zona || 'Sin zona asignada');

        let fechaTxt = '- Sin fecha -';
        if(c.fecha_evento) {
            let f = new Date(c.fecha_evento);
            f.setMinutes(f.getMinutes() + f.getTimezoneOffset());
            fechaTxt = `${f.getDate().toString().padStart(2,'0')}/${(f.getMonth()+1).toString().padStart(2,'0')}/${f.getFullYear()}`;
        }
        setEl('det-fecha', fechaTxt);
        
        let badgeClass = c.estado === 'Completada' ? 'success' : (c.estado === 'En curso' ? 'info' : 'warning');
        setEl('det-estado', `<span class="badge badge-${badgeClass} px-2 py-1 shadow-sm">${c.estado}</span>`);

        let plantados = c.cantidad_plantada || 0;
        let meta = c.cantidad_meta || c.cantidad_esperada || 1;
        let pct = Math.round((plantados / meta) * 100);

        setEl('det-progreso-texto', `${plantados} / ${meta} Árboles`);
        setEl('det-progreso-pct', `${pct}% Completado`);
        setEl('badge-total-arboles', `${arboles.length} Árbol(es)`);
        
        const barra = document.getElementById('det-progreso-barra');
        if(barra) barra.style.width = `${Math.min(pct, 100)}%`;

        const tbody = document.getElementById('tbody-arboles-campana');
        if(!tbody) return; 
        
        tbody.innerHTML = '';

        if (arboles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">Aún no se han registrado ejemplares bajo esta campaña.</td></tr>';
            return;
        }

        arboles.forEach(a => {
            let estado = a.estado_actual || 'Bueno';
            let estBadge = estado === 'Bueno' ? 'success' : (estado === 'Regular' ? 'warning' : 'danger');

            let fRegistro = '-';
            if(a.fecha_plantado) {
                let f2 = new Date(a.fecha_plantado);
                f2.setMinutes(f2.getMinutes() + f2.getTimezoneOffset());
                fRegistro = `${f2.getDate().toString().padStart(2,'0')}/${(f2.getMonth()+1).toString().padStart(2,'0')}/${f2.getFullYear()}`;
            }

            tbody.innerHTML += `
                <tr class="border-bottom">
                    <td class="pl-3 font-weight-bold text-muted align-middle">${a.id_arbol}</td>
                    <td class="align-middle"><span class="badge badge-light border text-gray-700 shadow-none px-3 py-2"><i class="fas fa-tag mr-1"></i>${a.codigo_etiqueta}</span></td>
                    <td class="align-middle">
                        <div class="font-weight-bold text-success" style="font-size: 1.05rem;">${a.nombre_comun}</div>
                        <div class="small text-muted">${a.nombre_cientifico || 'Sin registro científico'}</div>
                    </td>
                    <td class="text-center text-gray-800 font-weight-bold align-middle">${fRegistro}</td>
                    <td class="text-center align-middle"><span class="badge badge-${estBadge} px-3 py-2 rounded-pill shadow-none">${estado}</span></td>
                    <td class="text-center align-middle">
                        <a href="detalles_arbol.html?id=${a.codigo_etiqueta}" class="btn btn-sm btn-outline-info rounded-circle shadow-sm" title="Ver Expediente Clínico"><i class="fas fa-eye"></i></a>
                    </td>
                </tr>
            `;
        });

    } catch (error) {
        console.error("Error crítico capturado:", error);
        const titulo = document.getElementById('det-nombre-campana');
        if(titulo) titulo.innerText = 'Error de Carga';
        
        const tbody = document.getElementById('tbody-arboles-campana');
        if(tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div class="text-danger font-weight-bold mb-2"><i class="fas fa-exclamation-triangle fa-2x mb-2"></i><br>Error en la conexión.</div>
                        <code class="text-muted">${error.message}</code>
                    </td>
                </tr>`;
        }
    }
}